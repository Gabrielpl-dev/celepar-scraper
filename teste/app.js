let _buscandoNome = null

// ── Busca por MA via API Agrofit ──────────────────────────────
async function buscarPorApi(maOverride) {
  const ma   = (maOverride || document.getElementById('ma').value).trim()
  const saida = document.getElementById('saida')
  const btn   = document.getElementById('btn-buscar')

  if (!ma) { saida.innerHTML = '<p class="erro">Informe o registro MA.</p>'; return }

  if (btn) btn.disabled = true
  saida.innerHTML = '<p class="status">consultando API Agrofit e SIGEN...</p>'

  try {
    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    const [agrofit, sigen] = await Promise.all([
      fetch('/api/agrofit-docs?ma=' + encodeURIComponent(ma), { headers }).then(r => r.json()),
      fetch('/api/sigen?ma='        + encodeURIComponent(ma), { headers }).then(r => r.json()).catch(() => null),
    ])

    if (!agrofit.ok) { saida.innerHTML = `<p class="erro">Erro: ${agrofit.error}</p>`; return }

    const nome = agrofit.nome || ma
    let html = `<div class="prod-nome">${nome}</div>`
    if (agrofit.titular) html += `<div class="status">${agrofit.titular}</div>`
    if (agrofit.ingrediente) html += `<div class="status" style="color:#8b8">${agrofit.ingrediente}</div>`
    html += `<div class="status">MA: <strong>${agrofit.ma}</strong></div>`
    html += '<hr>'

    // ── Agrofit ──
    html += '<div class="fonte-header">Agrofit — Documentos</div>'
    const docs = agrofit.documentos || []
    if (agrofit.aviso) {
      html += `<p class="status">${agrofit.aviso}</p>`
    } else if (!docs.length) {
      html += '<p class="status">Nenhum documento encontrado.</p>'
    } else {
      const bulas   = docs.filter(d => d.tipo === 'Bula' || d.tipo === 'Rótulo')
      const outros  = docs.filter(d => d.tipo !== 'Bula' && d.tipo !== 'Rótulo')
      for (const doc of (bulas.length ? bulas : docs)) html += cardHtml(doc)
      if (bulas.length && outros.length) {
        html += `<a href="#" onclick="toggleOutros(event)" style="color:#2a6;font-size:12px">+ ${outros.length} outros (certificados, etc.)</a>`
        html += `<div id="outros" style="display:none">`
        for (const doc of outros) html += cardHtml(doc)
        html += `</div>`
      }
    }

    // ── SIGEN ──
    html += '<div class="fonte-header" style="margin-top:20px">SIGEN — Fichas de Emergência</div>'
    if (!sigen) {
      html += '<p class="status">Erro ao consultar SIGEN.</p>'
    } else if (!sigen.ok || !sigen.documentos?.length) {
      html += `<p class="status">${sigen?.error || 'Produto não encontrado no SIGEN.'}</p>`
    } else {
      for (const doc of sigen.documentos) html += sigenCardHtml(doc)
    }

    saida.innerHTML = html
  } catch (err) {
    saida.innerHTML = `<p class="erro">Erro de rede: ${err.message}</p>`
  } finally {
    if (btn) btn.disabled = false
  }
}

// ── Cards ─────────────────────────────────────────────────────
function cardHtml(doc) {
  const isPdf  = doc.url?.toLowerCase().includes('.pdf') || doc.url?.includes('p_id_file')
  const titulo = (doc.descricao || doc.tipo || 'documento').replace(/'/g, "\\'")
  const url    = doc.url || ''
  return `
    <div class="card">
      <div class="card-tipo">${doc.tipo || '—'}</div>
      <div class="card-nome">${doc.descricao || '—'}</div>
      <div class="card-data">${doc.origem ? `${doc.origem} · ` : ''}${doc.data || ''}</div>
      ${isPdf && url ? `<a href="#" onclick="toggleViewer(event,'${titulo}','${url}')">Ver PDF</a>` : ''}
      ${url ? `<a href="${url}" target="_blank">Baixar ↗</a>` : ''}
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
