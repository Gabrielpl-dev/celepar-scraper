import { api } from '/shared/api.js'

;(function() {
  try {
    const tok = localStorage.getItem('token')
    if (!tok) { location.href = '/'; return }
    JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { location.href = '/' }
})()

// ── Estado ────────────────────────────────────────────────────────────────────

const state = { Cod: '', ma: '', nome: '' }

function setNome(v) { state.nome = v; document.getElementById('p-nome').value = v }
function setCod(v)  { state.Cod  = v; document.getElementById('p-cod').value  = v }
function setMa(v)   { state.ma   = v; document.getElementById('p-ma').value   = v }

// ── Params: busca de produto ──────────────────────────────────────────────────

const nomeInput  = document.getElementById('p-nome')
const searchHint = document.getElementById('search-hint')
const dropdown   = document.getElementById('dropdown')

let debounceTimer = null
let searchResults = []
let hlIndex       = -1

nomeInput.addEventListener('input', () => {
  state.nome = nomeInput.value
  clearTimeout(debounceTimer)
  dropdown.style.display = 'none'
  searchResults = []; hlIndex = -1
  const val = nomeInput.value.trim()
  if (!val) return
  debounceTimer = setTimeout(async () => {
    searchHint.style.display = ''
    try {
      const data = await api.buscarProduto(val)
      searchResults = data.ok ? data.rows.slice(0, 10) : []
      hlIndex = -1
      renderDropdown()
    } finally {
      searchHint.style.display = 'none'
    }
  }, 400)
})

nomeInput.addEventListener('keydown', e => {
  if (!searchResults.length) return
  if (e.key === 'ArrowDown')  { e.preventDefault(); hlIndex = Math.min(hlIndex + 1, searchResults.length - 1); renderDropdown() }
  else if (e.key === 'ArrowUp')   { e.preventDefault(); hlIndex = Math.max(hlIndex - 1, 0); renderDropdown() }
  else if (e.key === 'Enter')     { e.preventDefault(); selectResult(searchResults[hlIndex >= 0 ? hlIndex : 0]) }
  else if (e.key === 'Escape')    { dropdown.style.display = 'none'; searchResults = [] }
})

nomeInput.addEventListener('blur', () => setTimeout(() => {
  dropdown.style.display = 'none'; searchResults = []
}, 150))

function renderDropdown() {
  if (!searchResults.length) { dropdown.style.display = 'none'; return }
  dropdown.innerHTML = ''
  searchResults.forEach((r, i) => {
    const li = document.createElement('li')
    if (i === hlIndex) li.classList.add('hl')
    const nomeSpan = `<span class="drop-nome">${r.nome}</span>`
    let metaSpan
    if (r.fonte === 'ambos') {
      metaSpan = `<span class="drop-ambos"><span class="drop-cod">${r.cod}</span><span class="drop-ma">MA ${r.ma}</span></span>`
    } else {
      metaSpan = r.ma ? `<span class="drop-ma">MA ${r.ma}</span>` : `<span class="drop-cod">${r.cod}</span>`
    }
    li.innerHTML = nomeSpan + metaSpan
    li.addEventListener('mousedown', () => selectResult(r))
    dropdown.appendChild(li)
  })
  dropdown.style.display = ''
}

function selectResult(r) {
  if (!r) return
  setNome(r.nome)
  setCod(r.cod || '')
  if (r.ma) setMa(r.ma)
  dropdown.style.display = 'none'; searchResults = []
  checkSources()
}

// ── Params: Cod e MA ──────────────────────────────────────────────────────────

document.getElementById('p-cod').addEventListener('input', e => { state.Cod = e.target.value })

document.getElementById('p-ma').addEventListener('input', e => {
  state.ma = e.target.value.replace(/\D/g, '')
  e.target.value = state.ma
})

document.getElementById('p-ma').addEventListener('blur', async () => {
  const ma = state.ma.trim()
  if (!ma || !/^\d+$/.test(ma)) return
  if (state.nome) { checkSources(); return }
  try {
    const data = await api.agrofitDocs(ma)
    if (data?.ok && data.nome) { setNome(data.nome); checkSources() }
  } catch (_) {}
})

// ── Params: fontes ────────────────────────────────────────────────────────────

const DOTS = ['banco', 'adapar', 'agrofit', 'sigen']

function setDots(cls) {
  DOTS.forEach(id => { document.getElementById('dot-' + id).className = 'dot ' + cls })
}

function applySourceResult(data) {
  DOTS.forEach(id => {
    const val = data[id]
    document.getElementById('dot-' + id).className = 'dot ' + (val === true ? 'on' : val === false ? 'off' : '')
  })
  const maInfo = document.getElementById('ma-info')
  maInfo.textContent = data.agrofitInfo?.ma ? 'MA ' + data.agrofitInfo.ma : ''
  if (data.agrofitInfo?.ma && !state.ma) setMa(data.agrofitInfo.ma)
}

async function checkSources() {
  if (!state.nome) return
  setDots('checking')
  try {
    const data = await api.verificarProduto(state.nome, state.ma, state.Cod)
    if (data.ok) applySourceResult(data)
    else setDots('')
  } catch (_) { setDots('') }
}

// ── Culturas ──────────────────────────────────────────────────────────────────

let culturas = []

async function carregarCulturas() {
  const data = await api.cccbCulturas()
  if (!data.ok) return
  culturas = data.culturas
  const dl = document.getElementById('culturas-list')
  dl.innerHTML = ''
  for (const c of culturas) {
    const opt = document.createElement('option')
    opt.value = c.nome
    dl.appendChild(opt)
  }
}

carregarCulturas()

// ── CCCB ─────────────────────────────────────────────────────────────────────

function setStatus(msg) { document.getElementById('status').textContent = msg }

async function rodarCCCB() {
  if (!state.nome) { setStatus('Preencha o nome do produto nos parâmetros.'); return }

  const input      = document.getElementById('cultura-input').value.trim()
  const culturaObj = culturas.find(c => c.nome === input)
  const culturaid  = culturaObj?.culturaid ?? null

  setStatus('consultando...')
  document.getElementById('btn-run').disabled = true
  document.getElementById('resultado').innerHTML = ''

  try {
    const t0   = Date.now()
    const data = await api.cccb(culturaid, state, true)
    const ms   = Date.now() - t0
    if (!data.ok) { setStatus('erro: ' + data.error); return }
    const { oracle, celepar, corretos, errados, faltando } = data
    const matchCelepar = celepar.length - faltando.length
    setStatus(
      `banco: ${oracle.length} = ✓${corretos.length} + ✗${errados.length}` +
      `  |  celepar: ${celepar.length} = ✓${matchCelepar} + ?${faltando.length}` +
      `  —  ${ms}ms`
    )
    renderResultado({ oracle, celepar, corretos, errados, faltando })
  } catch (err) {
    setStatus('erro: ' + err.message)
  } finally {
    document.getElementById('btn-run').disabled = false
  }
}

document.getElementById('btn-run').onclick = rodarCCCB
document.getElementById('cultura-input').addEventListener('keydown', e => { if (e.key === 'Enter') rodarCCCB() })

// ── Render ────────────────────────────────────────────────────────────────────

function renderResultado({ oracle, celepar, corretos, errados, faltando }) {
  const el = document.getElementById('resultado')
  el.innerHTML = ''
  if (oracle.length)   el.appendChild(renderTabela('Banco',    ['Cultura', 'Alvo SB', 'Diagnóstico', 'Nome Científico'],                                oracle.map(r  => [r.cultura, pill(r.siagroalv),      r.diagnostico,            r.nomecientifico])))
  if (celepar.length)  el.appendChild(renderTabela('Celepar',  ['Cultura', 'Alvo Siagro', 'Alvo', 'Nome Comum'],                                        celepar.map(r => [r.cultura, pill(r.siagro),         r.alvo,                   r.nomeComumAlvo])))
  if (errados.length)  el.appendChild(renderTabela('Errados',  ['Cultura', 'Alvo SB', 'Diagnóstico', 'Nome Científico', 'Nome Comum'],                   errados.map(r => [r.cultura, pill(r.alvo_sb, 'err'), r.diagnostico,            r.nomecientifico, r.nomeComumAlvo])))
  if (faltando.length) el.appendChild(renderTabelaFaltando('Faltando', faltando, oracle))
  el.appendChild(renderTabela('Corretos', ['Cultura', 'Alvo SB', 'Alvo Siagro', 'Diagnóstico', 'Nome Científico', 'Nome Comum'],  corretos.map(r => [r.cultura, pill(r.alvo_sb, 'ok'), pill(r.alvo_siagro, 'ok'), r.diagnostico, r.nomecientifico, r.nomeComumAlvo])))
}

function renderTabelaFaltando(titulo, faltandoRows, oracleRows) {
  const wrap = document.createElement('div')
  wrap.className = 'tabela-bloco'

  let open = true
  const tituloEl = document.createElement('div')
  tituloEl.className = 'tabela-titulo'
  tituloEl.innerHTML = `<span class="toggle">▾</span> ${titulo} <span style="color:#444">${faltandoRows.length} registro(s)</span>`

  const tabelaWrap = document.createElement('div')
  tabelaWrap.className = 'tabela-wrap'

  tituloEl.onclick = () => {
    open = !open
    tabelaWrap.style.display = open ? '' : 'none'
    tituloEl.querySelector('.toggle').textContent = open ? '▾' : '▸'
  }

  const table = document.createElement('table')
  table.innerHTML = '<thead><tr><th></th><th>Cultura</th><th>Alvo Siagro</th><th>Alvo</th><th>Nome Comum</th></tr></thead>'
  const tbody = document.createElement('tbody')

  for (const row of faltandoRows) {
    const matches = oracleRows.filter(o => String(o.siagroalv) === String(row.siagro))

    const tr = document.createElement('tr')

    const expandTd = document.createElement('td')
    expandTd.style.cssText = 'width:24px;text-align:center;color:#666;user-select:none;font-size:10px'

    if (matches.length) {
      expandTd.textContent = '▸'
      expandTd.style.cursor = 'pointer'
    }
    tr.appendChild(expandTd)
    tr.insertAdjacentHTML('beforeend',
      `<td>${row.cultura ?? '—'}</td>` +
      `<td>${pill(row.siagro, 'err')}</td>` +
      `<td>${row.alvo ?? '—'}</td>` +
      `<td>${row.nomeComumAlvo ?? '—'}</td>`
    )
    tbody.appendChild(tr)

    if (matches.length) {
      const subTr = document.createElement('tr')
      subTr.style.display = 'none'
      const subTd = document.createElement('td')
      subTd.colSpan = 5
      subTd.style.padding = '0'

      const subTable = document.createElement('table')
      subTable.className = 'sub-tabela'
      subTable.innerHTML = '<thead><tr><th>Cultura</th><th>Alvo SB</th><th>Diagnóstico</th><th>Nome Científico</th></tr></thead>'
      const subTbody = document.createElement('tbody')
      for (const m of matches) {
        const mtr = document.createElement('tr')
        mtr.innerHTML =
          `<td>${m.cultura ?? '—'}</td>` +
          `<td>${pill(m.siagroalv)}</td>` +
          `<td>${m.diagnostico ?? '—'}</td>` +
          `<td>${m.nomecientifico ?? '—'}</td>`
        subTbody.appendChild(mtr)
      }
      subTable.appendChild(subTbody)
      subTd.appendChild(subTable)
      subTr.appendChild(subTd)
      tbody.appendChild(subTr)

      let expanded = false
      const toggle = () => {
        expanded = !expanded
        subTr.style.display = expanded ? '' : 'none'
        expandTd.textContent = expanded ? '▾' : '▸'
      }
      expandTd.onclick = e => { e.stopPropagation(); toggle() }
      tr.style.cursor = 'pointer'
      tr.onclick = toggle
    }
  }

  table.appendChild(tbody)
  tabelaWrap.appendChild(table)
  wrap.appendChild(tituloEl)
  wrap.appendChild(tabelaWrap)
  return wrap
}

function pill(code, tipo) {
  const cls = tipo === 'ok' ? 'pill pill-ok' : tipo === 'err' ? 'pill pill-err' : 'pill'
  return `<span class="${cls}">${code ?? '—'}</span>`
}

function renderTabela(titulo, headers, rows) {
  const wrap = document.createElement('div')
  wrap.className = 'tabela-bloco'

  let open = true
  const tituloEl = document.createElement('div')
  tituloEl.className = 'tabela-titulo'
  tituloEl.innerHTML = `<span class="toggle">▾</span> ${titulo} <span style="color:#444">${rows.length} registro(s)</span>`

  const tabelaWrap = document.createElement('div')
  tabelaWrap.className = 'tabela-wrap'

  tituloEl.onclick = () => {
    open = !open
    tabelaWrap.style.display = open ? '' : 'none'
    tituloEl.querySelector('.toggle').textContent = open ? '▾' : '▸'
  }

  const table = document.createElement('table')
  table.innerHTML = '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>'
  const tbody = document.createElement('tbody')

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}" style="color:#444;font-style:italic">Nenhum registro.</td></tr>`
  } else {
    for (const row of rows) {
      const tr = document.createElement('tr')
      tr.innerHTML = row.map(cell => `<td>${cell ?? '—'}</td>`).join('')
      tbody.appendChild(tr)
    }
  }

  table.appendChild(tbody)
  tabelaWrap.appendChild(table)
  wrap.appendChild(tituloEl)
  wrap.appendChild(tabelaWrap)
  return wrap
}

// ── Utilitários ───────────────────────────────────────────────────────────────

async function sincronizar() {
  setStatus('sincronizando culturas...')
  try {
    const data = await api.sincronizarCulturas()
    if (!data.ok) { setStatus('erro: ' + data.error); return }
    setStatus(`${data.total} culturas sincronizadas`)
    carregarCulturas()
  } catch (err) { setStatus('erro: ' + err.message) }
}

async function buildMapping() {
  if (!state.nome) { setStatus('Preencha o nome do produto para gerar mapeamento.'); return }
  setStatus('gerando mapeamento...')
  try {
    const data = await api.cccbBuildMapping(state)
    if (!data.ok) { setStatus('erro: ' + data.error); return }
    const sem = data.unmatched.length ? data.unmatched.join(', ') : 'nenhuma'
    setStatus(`${data.matched}/${data.total} culturas mapeadas. Sem match: ${sem}`)
  } catch (err) { setStatus('erro: ' + err.message) }
}

document.getElementById('btn-sincronizar').onclick  = sincronizar
document.getElementById('btn-mapping').onclick      = buildMapping
