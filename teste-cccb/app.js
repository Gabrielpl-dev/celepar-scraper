;(function() {
  try {
    const tok = localStorage.getItem('token')
    if (!tok) { location.href = '/'; return }
    JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch { location.href = '/' }
})()

function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token')
  opts.headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token
  return fetch(url, opts).then(r => {
    if (r.status === 401) { alert('Sessão expirada. Faça login novamente.'); location.href = '/'; return Promise.reject() }
    return r.json()
  })
}

// ── Params ────────────────────────────────────────────────────────────────────

function getParams() {
  return {
    Cod:  document.getElementById('p-cod').value.trim(),
    ma:   document.getElementById('p-ma').value.trim(),
    nome: document.getElementById('p-nome').value.trim(),
  }
}

// ── Culturas ─────────────────────────────────────────────────────────────────

let culturas = []

function carregarCulturas() {
  authFetch('/api/banco/cccb/culturas').then(data => {
    if (!data.ok) return
    culturas = data.culturas
    const dl = document.getElementById('culturas-list')
    dl.innerHTML = ''
    for (const c of culturas) {
      const opt = document.createElement('option')
      opt.value = c.nome
      dl.appendChild(opt)
    }
  })
}

carregarCulturas()

// ── Status ────────────────────────────────────────────────────────────────────

function setStatus(msg) {
  document.getElementById('status').textContent = msg
}

// ── CCCB ─────────────────────────────────────────────────────────────────────

function rodarCCCB() {
  const params = getParams()
  if (!params.nome) { setStatus('Preencha o nome do produto.'); return }

  const input      = document.getElementById('cultura-input').value.trim()
  const culturaObj = culturas.find(c => c.nome === input)
  const culturaid  = culturaObj?.culturaid ?? null

  setStatus('consultando...')
  document.getElementById('btn-run').disabled = true
  document.getElementById('resultado').innerHTML = ''

  const t0 = Date.now()
  authFetch('/api/banco/cccb', {
    method: 'POST',
    body: JSON.stringify({ culturaid, params }),
  }).then(data => {
    const ms = Date.now() - t0
    if (!data.ok) { setStatus('erro: ' + data.error); return }
    const { oracle, celepar, corretos, errados } = data
    setStatus(`banco: ${oracle.length} | celepar: ${celepar.length} | corretos: ${corretos.length} | errados: ${errados.length} — ${ms}ms`)
    renderResultado({ oracle, celepar, corretos, errados })
  }).finally(() => {
    document.getElementById('btn-run').disabled = false
  })
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderResultado({ oracle, celepar, corretos, errados }) {
  const el = document.getElementById('resultado')
  el.innerHTML = ''

  if (oracle.length)   el.appendChild(renderTabela('Banco', ['Cultura', 'Alvo SB', 'Diagnóstico'], oracle.map(r => [r.cultura, pill(r.siagroalv), r.diagnostico])))
  if (celepar.length)  el.appendChild(renderTabela('Celepar', ['Cultura', 'Alvo Siagro', 'Alvo'], celepar.map(r => [r.cultura, pill(r.siagro), r.alvo])))
  if (errados.length)  el.appendChild(renderTabela('Errados', ['Cultura', 'Alvo SB', 'DIAGNOSTICOID', 'Diagnóstico'], errados.map(r => [r.cultura, pill(r.alvo_sb, 'err'), r.diagnosticoid, r.diagnostico])))
  el.appendChild(renderTabela('Corretos', ['Cultura', 'Alvo SB', 'Alvo Siagro', 'Diagnóstico'], corretos.map(r => [r.cultura, pill(r.alvo_sb, 'ok'), pill(r.alvo_siagro, 'ok'), r.diagnostico])))
}

function pill(code, tipo) {
  const cls = tipo === 'ok' ? 'pill pill-ok' : tipo === 'err' ? 'pill pill-err' : 'pill'
  return `<span class="${cls}">${code ?? '—'}</span>`
}

function renderTabela(titulo, headers, rows) {
  const wrap = document.createElement('div')
  wrap.className = 'tabela-bloco'

  const count = rows.length
  let open = true

  const tituloEl = document.createElement('div')
  tituloEl.className = 'tabela-titulo'
  tituloEl.innerHTML = `<span class="toggle">▾</span> ${titulo} <span style="color:#444">${count} registro(s)</span>`

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

  if (rows.length === 0) {
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

function sincronizar() {
  setStatus('sincronizando culturas...')
  authFetch('/api/banco/culturas/sincronizar', { method: 'POST' }).then(data => {
    if (!data.ok) { setStatus('erro: ' + data.error); return }
    setStatus(`${data.total} culturas sincronizadas`)
    carregarCulturas()
  })
}

function buildMapping() {
  const params = getParams()
  if (!params.nome) { setStatus('Preencha o nome do produto para gerar mapeamento.'); return }
  setStatus('gerando mapeamento...')
  authFetch('/api/banco/cccb/build-mapping', {
    method: 'POST',
    body: JSON.stringify({ params }),
  }).then(data => {
    if (!data.ok) { setStatus('erro: ' + data.error); return }
    const sem = data.unmatched.length ? data.unmatched.join(', ') : 'nenhuma'
    setStatus(`${data.matched}/${data.total} culturas mapeadas. Sem match: ${sem}`)
  })
}

// Enter no input de cultura roda o CCCB
document.getElementById('cultura-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') rodarCCCB()
})
