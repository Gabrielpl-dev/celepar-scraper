const sqlEl  = document.getElementById('sql')
const status = document.getElementById('status')
const btnRun = document.getElementById('btn-run')
const result = document.getElementById('resultado')

let tabelasCarregadas = false

function mudarAba(nome, btn) {
  document.querySelectorAll('.aba').forEach(el => el.classList.add('hidden'))
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'))
  document.getElementById('aba-' + nome).classList.remove('hidden')
  btn.classList.add('active')
  if (nome === 'navegacao' && !tabelasCarregadas) carregarTabelas()
}

async function carregarTabelas() {
  const navStatus  = document.getElementById('nav-status')
  const navTabelas = document.getElementById('nav-tabelas')

  try {
    const res  = await fetch('/api/banco', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ sql: "SELECT table_name FROM all_tables WHERE owner = 'VIASOFT' ORDER BY table_name" }),
    })
    const data = await res.json()

    if (!data.ok) {
      navStatus.className   = 'nav-status erro'
      navStatus.textContent = data.error
      return
    }

    tabelasCarregadas = true
    navStatus.textContent = `${data.rows.length} tabelas`

    const html = ['<div class="nav-lista">']
    for (const row of data.rows) {
      html.push(`<span class="nav-tabela">${esc(row.TABLE_NAME)}</span>`)
    }
    html.push('</div>')
    navTabelas.innerHTML = html.join('')

  } catch (err) {
    navStatus.className   = 'nav-status erro'
    navStatus.textContent = 'Erro de rede: ' + err.message
  }
}

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

  btnRun.disabled = true
  status.className = 'status'
  status.textContent = 'executando...'
  result.innerHTML = ''

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
        if (v === null || v === undefined) {
          html.push('<td class="null">null</td>')
        } else {
          html.push(`<td title="${esc(String(v))}">${esc(String(v))}</td>`)
        }
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

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
