// ── Busca por MA via API Agrofit ──────────────────────────────
async function buscarPorApi(maOverride) {
  const ma    = (maOverride || document.getElementById('ma').value).trim()
  const saida = document.getElementById('saida')
  const btn   = document.getElementById('btn-buscar')

  if (!ma) { saida.innerHTML = '<p class="erro">Informe o registro MA.</p>'; return }

  if (btn) btn.disabled = true
  saida.innerHTML = '<p class="status">buscando...</p>'

  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  // Renderiza seção placeholder e preenche conforme cada fonte resolve
  saida.innerHTML = `
    <div id="sec-header"></div>
    <hr id="sec-hr" style="display:none">
    <div class="fonte-header">Agrofit — Documentos</div>
    <div id="sec-agrofit"><p class="status">carregando...</p></div>
    <div class="fonte-header" style="margin-top:20px">SIGEN — Fichas de Emergência</div>
    <div id="sec-sigen"><p class="status">carregando...</p></div>
  `

  // ── Agrofit ──
  fetch('/api/agrofit-docs?ma=' + encodeURIComponent(ma), { headers })
    .then(r => r.json())
    .then(data => {
      const secHeader  = document.getElementById('sec-header')
      const secAgrofit = document.getElementById('sec-agrofit')
      const hr         = document.getElementById('sec-hr')
      if (!secHeader) return

      if (!data.ok) { secAgrofit.innerHTML = `<p class="erro">${data.error}</p>`; return }

      // Header do produto
      let h = `<div class="prod-nome">${data.nome || ma}</div>`
      if (data.titular)    h += `<div class="status">${data.titular}</div>`
      if (data.ingrediente) h += `<div class="status" style="color:#8b8">${data.ingrediente}</div>`
      h += `<div class="status">MA: <strong>${data.ma}</strong></div>`
      secHeader.innerHTML = h
      hr.style.display = ''

      // Documentos
      const docs  = data.documentos || []
      if (data.aviso || !docs.length) {
        secAgrofit.innerHTML = `<p class="status">${data.aviso || 'Nenhum documento encontrado.'}</p>`
        return
      }
      const bulas  = docs.filter(d => d.tipo === 'Bula' || d.tipo === 'Rótulo')
      const outros = docs.filter(d => d.tipo !== 'Bula' && d.tipo !== 'Rótulo')
      let html = ''
      for (const doc of (bulas.length ? bulas : docs)) html += cardHtml(doc)
      if (bulas.length && outros.length) {
        html += `<a href="#" onclick="toggleOutros(event)" style="color:#2a6;font-size:12px">+ ${outros.length} outros</a>`
        html += `<div id="outros" style="display:none">`
        for (const doc of outros) html += cardHtml(doc)
        html += `</div>`
      }
      secAgrofit.innerHTML = html
    })
    .catch(err => {
      const el = document.getElementById('sec-agrofit')
      if (el) el.innerHTML = `<p class="erro">Erro: ${err.message}</p>`
    })
    .finally(() => { if (btn) btn.disabled = false })

  // ── SIGEN ──
  fetch('/api/sigen?ma=' + encodeURIComponent(ma), { headers })
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('sec-sigen')
      if (!el) return
      if (!data.ok || !data.documentos?.length) {
        el.innerHTML = `<p class="status">${data?.error || data?.aviso || 'Produto não encontrado no SIGEN.'}</p>`
        return
      }
      el.innerHTML = data.documentos.map(sigenCardHtml).join('')
    })
    .catch(err => {
      const el = document.getElementById('sec-sigen')
      if (el) el.innerHTML = `<p class="erro">Erro SIGEN: ${err.message}</p>`
    })
}

// ── Cards ─────────────────────────────────────────────────────
function cardHtml(doc) {
  const isPdf  = doc.url?.toLowerCase().includes('.pdf') || doc.url?.includes('p_id_file')
  const titulo = (doc.descricao || doc.tipo || 'documento').replace(/'/g, "\\'")
  const proxy  = doc.url ? `/api/agrofit-pdf?url=${encodeURIComponent(doc.url)}` : ''
  return `
    <div class="card">
      <div class="card-tipo">${doc.tipo || '—'}</div>
      <div class="card-nome">${doc.descricao || '—'}</div>
      <div class="card-data">${doc.origem ? `${doc.origem} · ` : ''}${doc.data || ''}</div>
      ${isPdf && proxy ? `<a href="#" onclick="toggleViewer(event,'${titulo}','${proxy}')">Ver PDF</a>` : ''}
      ${doc.url ? `<a href="${doc.url}" target="_blank">Baixar ↗</a>` : ''}
    </div>`
}

function sigenCardHtml(doc) {
  const titulo = (doc.nomeArquivo || doc.tipo || 'documento').replace(/'/g, "\\'")
  return `
    <div class="card">
      <div class="card-tipo">${doc.tipo || '—'}</div>
      <div class="card-nome">${doc.nomeArquivo || '—'}</div>
      <a href="#" onclick="toggleViewer(event,'${titulo}','${doc.url}')">Ver PDF</a>
      <a href="${doc.url}" target="_blank">Baixar ↗</a>
    </div>`
}

// ── PDF overlay ───────────────────────────────────────────────
function toggleViewer(e, titulo, url) {
  e.preventDefault()
  document.getElementById('pdf-overlay-titulo').textContent = titulo
  const frame = document.getElementById('pdf-overlay-frame')
  if (frame.src !== url) frame.src = url
  document.getElementById('pdf-overlay').classList.add('aberto')
}

function fecharPdf() {
  document.getElementById('pdf-overlay').classList.remove('aberto')
}

function toggleOutros(e) {
  e.preventDefault()
  const el = document.getElementById('outros')
  el.style.display = el.style.display === 'none' ? 'block' : 'none'
}

// ── Busca por nome ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('busca-nome')
  if (!input) return
  let debounce = null
  input.addEventListener('input', () => {
    clearTimeout(debounce)
    const v = input.value.trim()
    if (!v) { document.getElementById('nome-resultados').innerHTML = ''; return }
    debounce = setTimeout(() => buscarNome(v), 400)
  })
})

async function buscarNome(nome) {
  const el      = document.getElementById('nome-resultados')
  const token   = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  el.innerHTML  = '<p class="status">buscando...</p>'
  try {
    const data = await fetch('/api/buscar-produto?nome=' + encodeURIComponent(nome), { headers }).then(r => r.json())
    if (!data.ok || !data.rows?.length) { el.innerHTML = '<p class="hint-id novo">Nenhum resultado.</p>'; return }
    let html = '<div class="nome-lista">'
    for (const r of data.rows) {
      const label = r.ma ? `MA ${r.ma}` : (r.cod || '')
      html += `<div class="nome-item" onclick="selecionarNome('${(r.nome||'').replace(/'/g,"\\'")}','${(r.ma||'').replace(/'/g,"\\'")}')">
        <span class="nome-item-nome">${r.nome || '—'}</span>
        <span class="nome-item-ma">${label}</span>
      </div>`
    }
    html += '</div>'
    el.innerHTML = html
  } catch { el.innerHTML = '<p class="erro">Erro na busca.</p>' }
}

function selecionarNome(nome, ma) {
  document.getElementById('nome-resultados').innerHTML = ''
  document.getElementById('busca-nome').value = ''
  if (ma) {
    document.getElementById('ma').value = ma
    buscarPorApi(ma)
  }
}
