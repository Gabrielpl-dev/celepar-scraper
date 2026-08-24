;(function () {
  try {
    const tok = localStorage.getItem('token')
    if (!tok) { location.href = '/'; return }
    const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.role !== 'admin') { location.href = '/'; return }
  } catch { location.href = '/'; return }
})()

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: 'Bearer ' + token } : {}
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderTable(cols, rows) {
  if (!rows.length) return '<p class="empty">Sem registros.</p>'
  let html = '<p class="tbl-count">' + rows.length + ' registro' + (rows.length !== 1 ? 's' : '') + '</p>'
  html += '<table><thead><tr>'
  for (const c of cols) html += '<th>' + esc(c) + '</th>'
  html += '</tr></thead><tbody>'
  for (const row of rows) {
    html += '<tr>'
    for (const c of cols) {
      const v = row[c]
      html += v == null
        ? '<td class="null">null</td>'
        : '<td title="' + esc(String(v)) + '">' + esc(String(v)) + '</td>'
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

function toggleTbl(id) {
  const body = document.getElementById('body-' + id)
  const seta = document.getElementById('seta-' + id)
  const open = body.classList.contains('open')
  body.classList.toggle('open', !open)
  seta.classList.toggle('open', !open)
}

async function carregar() {
  const el = document.getElementById('conteudo')
  try {
    const res  = await fetch('/api/internos', { headers: authHeader() })
    if (res.status === 401) { location.href = '/'; return }
    if (res.status === 403) { el.innerHTML = '<p class="nav-status erro">Acesso restrito a administradores.</p>'; return }
    const data = await res.json()
    if (!data.ok) { el.innerHTML = '<p class="nav-status erro">' + esc(data.error) + '</p>'; return }

    let html = ''
    for (const db of data.databases) {
      html += '<div class="db-section">'
      html += '<div class="db-title">' + esc(db.name) + '</div>'
      html += '<div class="db-path">' + esc(db.label) + '</div>'

      for (const tbl of db.tables) {
        const id = db.name + '__' + tbl.name
        html += '<div class="tbl-accordion">'
        html += '<button class="tbl-header" onclick="toggleTbl(\'' + id + '\')">'
        html += '<span>' + esc(tbl.name) + '</span>'
        html += '<span class="tbl-seta" id="seta-' + id + '">▸</span>'
        html += '</button>'
        html += '<div class="tbl-body" id="body-' + id + '">'
        html += renderTable(tbl.cols, tbl.rows)
        html += '</div>'
        html += '</div>'
      }

      html += '</div>'
    }
    el.innerHTML = html
  } catch (err) {
    el.innerHTML = '<p class="nav-status erro">Erro de rede: ' + esc(err.message) + '</p>'
  }
}

carregar()
