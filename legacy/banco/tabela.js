;(function() {
  try {
    const tok = localStorage.getItem('token')
    if (!tok) { location.href = '/'; return }
    const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.role !== 'admin') location.href = '/'
  } catch { location.href = '/' }
})()

const nome = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop())

document.getElementById('titulo').textContent = nome
document.title = nome + ' — Oracle'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: 'Bearer ' + token } : {}
}

async function query(sql) {
  const res  = await fetch('/api/banco', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body:    JSON.stringify({ sql }),
  })
  if (res.status === 401) { alert('Sessão expirada. Faça login novamente.'); location.href = '/'; return { ok: false, error: 'não autenticado' } }
  return res.json()
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

async function carregarColunas() {
  const statusEl = document.getElementById('colunas-status')
  const listaEl  = document.getElementById('colunas-lista')

  const data = await query(
    `SELECT column_name, data_type, nullable FROM all_tab_columns ` +
    `WHERE owner = 'VIASOFT' AND table_name = '${nome}' ORDER BY column_id`
  )

  if (!data.ok) {
    statusEl.className   = 'nav-status erro'
    statusEl.textContent = data.error
    return
  }

  statusEl.textContent = `${data.rows.length} coluna${data.rows.length !== 1 ? 's' : ''}`
  document.getElementById('sub').textContent = `${data.rows.length} colunas`

  const html = ['<div class="col-lista">']
  for (const row of data.rows) {
    const nullable = row.NULLABLE === 'Y' ? '<span class="nullable">nullable</span>' : ''
    html.push(`<span class="col-badge">${esc(row.COLUMN_NAME)}<span>${esc(row.DATA_TYPE)}</span>${nullable}</span>`)
  }
  html.push('</div>')
  listaEl.innerHTML = html.join('')
}

async function carregarDados() {
  const statusEl = document.getElementById('dados-status')
  const tabelaEl = document.getElementById('dados-tabela')

  const data = await query(`SELECT * FROM ${nome}`)

  if (!data.ok) {
    statusEl.className   = 'nav-status erro'
    statusEl.textContent = data.error
    return
  }

  const { cols, rows } = data
  statusEl.textContent = `${rows.length} linha${rows.length !== 1 ? 's' : ''}`

  if (!rows.length) { tabelaEl.innerHTML = '<p style="color:#555;font-size:12px">Sem dados.</p>'; return }

  const html = ['<table><thead><tr>']
  for (const c of cols) html.push(`<th>${esc(c)}</th>`)
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
  tabelaEl.innerHTML = html.join('')
}

carregarColunas()
carregarDados()
