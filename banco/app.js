const sqlEl  = document.getElementById('sql')
const status = document.getElementById('status')
const btnRun = document.getElementById('btn-run')
const result = document.getElementById('resultado')
const menu   = document.getElementById('menu-flutuante')

// ── Abas ─────────────────────────────────────────────────────────────────────

let navInicializado = false

function mudarAba(nome, btn) {
  document.querySelectorAll('.aba').forEach(el => el.classList.add('hidden'))
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'))
  document.getElementById('aba-' + nome).classList.remove('hidden')
  btn.classList.add('active')
  if (nome === 'navegacao' && !navInicializado) {
    navInicializado = true
    carregarConhecidas()
  }
}

// ── Acordeões ─────────────────────────────────────────────────────────────────

const todasCarregadas = { feito: false }

function toggleAcc(nome) {
  const body  = document.querySelector(`#acc-${nome} .acc-body`)
  const seta  = document.querySelector(`#acc-${nome} .acc-seta`)
  const aberto = !body.classList.contains('hidden')
  body.classList.toggle('hidden', aberto)
  seta.classList.toggle('aberto', !aberto)
  if (!aberto && nome === 'todas' && !todasCarregadas.feito) carregarTodas()
}

// ── Menu flutuante ────────────────────────────────────────────────────────────

let menuContexto = { nome: null, origem: null }

function abrirMenu(e, nome, origem) {
  e.stopPropagation()
  menuContexto = { nome, origem }

  document.getElementById('menu-btn-salvar').classList.toggle('hidden',  origem === 'conhecidas')
  document.getElementById('menu-btn-excluir').classList.toggle('hidden', origem !== 'conhecidas')
  document.getElementById('menu-btn-excluir').className =
    origem === 'conhecidas' ? 'perigo' : 'hidden'

  const x = Math.min(e.clientX, window.innerWidth  - 150)
  const y = Math.min(e.clientY, window.innerHeight - 100)
  menu.style.left = x + 'px'
  menu.style.top  = y + 'px'
  menu.classList.remove('hidden')
}

document.addEventListener('click', () => menu.classList.add('hidden'))

function acessarTabela() {
  menu.classList.add('hidden')
  // futuro
}

async function salvarTabela() {
  menu.classList.add('hidden')
  const { nome } = menuContexto
  const res  = await fetch('/api/banco/tabelas/salvar', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nome }),
  })
  const data = await res.json()
  if (data.ok) atualizarConhecidas(data.tabelas)
}

async function excluirTabela() {
  menu.classList.add('hidden')
  const { nome } = menuContexto
  const res  = await fetch('/api/banco/tabelas/excluir', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nome }),
  })
  const data = await res.json()
  if (data.ok) atualizarConhecidas(data.tabelas)
}

// ── Tabelas conhecidas ────────────────────────────────────────────────────────

async function carregarConhecidas() {
  const statusEl = document.getElementById('nav-conhecidas-status')
  const listaEl  = document.getElementById('nav-conhecidas')
  try {
    const res  = await fetch('/banco/tabelas.json')
    const data = await res.json()
    atualizarConhecidas(data.tabelas ?? [])
  } catch (err) {
    statusEl.className   = 'nav-status erro'
    statusEl.textContent = 'Erro ao carregar tabelas.json: ' + err.message
  }
}

function atualizarConhecidas(tabelas) {
  const statusEl = document.getElementById('nav-conhecidas-status')
  const listaEl  = document.getElementById('nav-conhecidas')
  if (!tabelas.length) {
    statusEl.textContent = 'Nenhuma tabela salva ainda.'
    listaEl.innerHTML    = ''
    return
  }
  statusEl.textContent = `${tabelas.length} tabela${tabelas.length !== 1 ? 's' : ''}`
  listaEl.innerHTML    = renderLista(tabelas, 'conhecidas')
}

// ── Todas as tabelas ──────────────────────────────────────────────────────────

async function carregarTodas() {
  const statusEl = document.getElementById('nav-todas-status')
  const listaEl  = document.getElementById('nav-todas')
  try {
    const res  = await fetch('/api/banco', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sql: "SELECT table_name FROM all_tables WHERE owner = 'VIASOFT' ORDER BY table_name" }),
    })
    const data = await res.json()
    if (!data.ok) {
      statusEl.className   = 'nav-status erro'
      statusEl.textContent = data.error
      return
    }
    todasCarregadas.feito = true
    statusEl.textContent  = `${data.rows.length} tabelas`
    listaEl.innerHTML     = renderLista(data.rows.map(r => r.TABLE_NAME), 'todas')
  } catch (err) {
    statusEl.className   = 'nav-status erro'
    statusEl.textContent = 'Erro de rede: ' + err.message
  }
}

function renderLista(nomes, origem) {
  return '<div class="nav-lista">' +
    nomes.map(n =>
      `<span class="nav-tabela" onclick="abrirMenu(event,'${esc(n)}','${origem}')">${esc(n)}</span>`
    ).join('') +
    '</div>'
}

// ── Aba SQL ───────────────────────────────────────────────────────────────────

function usar(el) {
  sqlEl.value = el.textContent.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  sqlEl.focus()
}

sqlEl.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') rodar()
})

async function rodar() {
  const sql = sqlEl.value.trim()
  if (!sql) return
  btnRun.disabled    = true
  status.className   = 'status'
  status.textContent = 'executando...'
  result.innerHTML   = ''
  try {
    const res  = await fetch('/api/banco', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sql }),
    })
    const data = await res.json()
    if (!data.ok) {
      status.className   = 'status erro'
      status.textContent = data.error
      return
    }
    const { cols, rows } = data
    status.className   = 'status ok'
    status.textContent = `${rows.length} linha${rows.length !== 1 ? 's' : ''}`
    if (!cols.length) { result.innerHTML = '<p style="color:#555;font-size:12px">Sem resultados.</p>'; return }
    const html = [`<div class="row-count">${rows.length} resultado${rows.length !== 1 ? 's' : ''}</div><table><thead><tr>`]
    for (const c of cols) html.push(`<th>${c}</th>`)
    html.push('</tr></thead><tbody>')
    for (const row of rows) {
      html.push('<tr>')
      for (const c of cols) {
        const v = row[c]
        html.push(v == null
          ? '<td class="null">null</td>'
          : `<td title="${esc(String(v))}">${esc(String(v))}</td>`)
      }
      html.push('</tr>')
    }
    html.push('</tbody></table>')
    result.innerHTML = html.join('')
  } catch (err) {
    status.className   = 'status erro'
    status.textContent = 'Erro de rede: ' + err.message
  } finally {
    btnRun.disabled = false
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
