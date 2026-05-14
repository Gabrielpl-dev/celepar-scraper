// ── cache de IDs (servidor) ────────────────────────────────────
let _idsCache = null; // { [ma]: { ma, id, nome, atualizado } }

async function loadIds() {
  try {
    const res  = await fetch('http://localhost:3000/api/agrofit-ids');
    const data = await res.json();
    _idsCache = {};
    for (const row of (data.ids || [])) _idsCache[row.ma] = row;
  } catch {
    _idsCache = {};
  }
  renderIdsSalvos();
}

async function removeId(ma) {
  try {
    await fetch(`http://localhost:3000/api/agrofit-ids/${encodeURIComponent(ma)}`, { method: 'DELETE' });
    if (_idsCache) delete _idsCache[ma];
    renderIdsSalvos();
    checarIdSalvo();
  } catch { /* silencioso */ }
}

function findId(ma) {
  if (!_idsCache) return null;
  return _idsCache[ma.trim()]?.id || null;
}

// ── Hint + botão direto ───────────────────────────────────────
function checarIdSalvo() {
  const ma   = document.getElementById('ma').value.trim();
  const hint = document.getElementById('hint-id');
  const btn  = document.getElementById('btn-direto');

  const id = ma ? findId(ma) : null;
  if (id) {
    hint.textContent  = `✓ ID Agrofit salvo: ${id} — vai buscar direto`;
    hint.className    = 'hint-id encontrado';
    btn.style.display = 'inline-block';
  } else {
    hint.textContent  = ma ? 'ID Agrofit não cadastrado — cole a URL do Agrofit no passo 2' : '';
    hint.className    = ma ? 'hint-id novo' : 'hint-id';
    btn.style.display = 'none';
  }
}

// ── Busca direta (ID já salvo) ────────────────────────────────
function buscarDireto() {
  const ma = document.getElementById('ma').value.trim();
  const id = findId(ma);
  if (!id) return;
  buscarPorId(ma, id);
}

// ── Busca via URL colada ──────────────────────────────────────
function buscarPorUrl() {
  const urlInput = document.getElementById('url').value.trim();
  const saida    = document.getElementById('saida');

  if (!urlInput) { saida.innerHTML = '<p class="erro">Cole a URL do produto.</p>'; return; }

  let id, ma;
  try {
    const u = new URL(urlInput);
    id = u.searchParams.get('p_id_produto_formulado_tecnico');
    ma = u.searchParams.get('p_nr_registro') || document.getElementById('ma').value.trim();
  } catch {
    saida.innerHTML = '<p class="erro">URL inválida.</p>';
    return;
  }

  if (!id) {
    saida.innerHTML = '<p class="erro">Não encontrei <code>p_id_produto_formulado_tecnico</code> na URL.</p>';
    return;
  }
  if (!ma) {
    saida.innerHTML = '<p class="erro">Não encontrei o registro MA na URL. Preencha o campo MA manualmente.</p>';
    return;
  }

  buscarPorId(ma, id);
}

// ── Busca central ─────────────────────────────────────────────
async function buscarPorId(ma, id) {
  const saida   = document.getElementById('saida');
  const btnDir  = document.getElementById('btn-direto');
  const btnBusc = document.getElementById('btn-buscar');

  btnDir.disabled  = true;
  btnBusc.disabled = true;
  if (!saida.innerHTML.trim()) saida.innerHTML = '<p class="status">consultando agrofit...</p>';

  try {
    const res  = await fetch('http://localhost:3000/api/agrofit?' + new URLSearchParams({ ma, id }));
    const data = await res.json();

    if (!data.ok) {
      saida.innerHTML = `<p class="erro">Erro: ${data.error}</p>`;
      return;
    }

    if (data.id && _idsCache !== null) {
      _idsCache[ma] = { ma, id: data.id, nome: data.nome };
    }
    renderIdsSalvos();
    checarIdSalvo();

    let html = `<div class="prod-nome">${data.nome || ma}</div>`;
    html += `<div class="status">MA: <strong>${ma}</strong> · ID Agrofit: <strong>${data.id}</strong><span class="salvo-badge">✓ salvo</span></div>`;
    html += '<hr>';

    if (!data.documentos.length) {
      html += '<p class="status">Nenhum documento encontrado.</p>';
    } else {
      const principais = data.documentos.filter(d => d.tipo === 'Bula' || d.tipo === 'Rótulo');
      const outros     = data.documentos.filter(d => d.tipo !== 'Bula' && d.tipo !== 'Rótulo');
      const mostrar    = principais.length > 0 ? principais : data.documentos;

      html += `<div class="status">${mostrar.length} documento(s) principais`;
      if (outros.length > 0 && principais.length > 0) {
        html += ` · <a href="#" onclick="toggleOutros(event)" style="color:#2a6">+ ${outros.length} outros</a>`;
      }
      html += '</div>';

      for (const doc of mostrar) html += cardHtml(doc);

      if (outros.length > 0 && principais.length > 0) {
        html += `<div id="outros" style="display:none">`;
        for (const doc of outros) html += cardHtml(doc);
        html += `</div>`;
      }
    }

    saida.innerHTML = html;
  } catch (err) {
    saida.innerHTML = `<p class="erro">Erro de rede: ${err.message}<br>O backend está rodando?</p>`;
  } finally {
    btnDir.disabled  = false;
    btnBusc.disabled = false;
  }
}

// ── Cards ─────────────────────────────────────────────────────
function cardHtml(doc) {
  let ext = '';
  try { ext = new URLSearchParams(new URL(doc.url).search).get('p_nm_file')?.split('.').pop().toLowerCase() || ''; } catch {}
  const proxy  = `http://localhost:3000/api/agrofit-pdf?url=${encodeURIComponent(doc.url)}`;
  const titulo = (doc.nomeArquivo || doc.tipo || 'documento').replace(/'/g, "\\'");
  const isPdf  = ext === 'pdf';
  return `
    <div class="card">
      <div class="card-tipo">${doc.tipo || '—'}</div>
      <div class="card-nome">${doc.nomeArquivo || '—'}</div>
      <div class="card-data">${doc.data || ''}</div>
      ${isPdf ? `<a href="#" onclick="toggleViewer(event,'${titulo}','${proxy}')">Ver PDF</a>` : ''}
      <a href="${proxy}" target="_blank">${isPdf ? 'Baixar ↗' : `Abrir ${ext.toUpperCase()} ↗`}</a>
    </div>`;
}

function toggleViewer(e, titulo, url) {
  e.preventDefault();
  document.getElementById('pdf-overlay-titulo').textContent = titulo;
  const frame = document.getElementById('pdf-overlay-frame');
  if (frame.src !== url) frame.src = url;
  document.getElementById('pdf-overlay').classList.add('aberto');
}

function fecharPdf() {
  document.getElementById('pdf-overlay').classList.remove('aberto');
}

function toggleOutros(e) {
  e.preventDefault();
  const el = document.getElementById('outros');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ── Copiar e abrir Agrofit ────────────────────────────────────
function abrirAgrofit() {
  const ma = document.getElementById('ma').value.trim();
  if (!ma) { alert('Informe o registro MA primeiro.'); return; }
  navigator.clipboard.writeText(ma).then(() => {
    const aviso = document.getElementById('copiado');
    aviso.style.display = 'inline';
    setTimeout(() => aviso.style.display = 'none', 2500);
  });
  window.open('https://agrofit.agricultura.gov.br/agrofit_cons/!ap_produto_form_consulta_cons', '_blank');
}

// ── IDs Salvos ────────────────────────────────────────────────
function toggleIdsSalvos() {
  const lista  = document.getElementById('ids-lista');
  const aberto = lista.style.display === 'block';
  lista.style.display = aberto ? 'none' : 'block';
  if (!aberto) renderIdsSalvos();
  document.getElementById('ids-titulo').textContent =
    (aberto ? '▶' : '▼') + document.getElementById('ids-titulo').textContent.slice(1);
}

function renderIdsSalvos() {
  const chaves = _idsCache ? Object.keys(_idsCache).sort() : [];
  const titulo = document.getElementById('ids-titulo');
  titulo.textContent = titulo.textContent.replace(/\(\d+\)/, `(${chaves.length})`);

  const lista = document.getElementById('ids-lista');
  if (lista.style.display !== 'block') return;

  if (!chaves.length) {
    lista.innerHTML = '<p class="ids-vazio">Nenhum ID salvo ainda.</p>';
    return;
  }

  let html = '<table class="ids-table"><thead><tr><th>MA</th><th>Nome</th><th>ID Agrofit</th><th></th><th></th></tr></thead><tbody>';
  for (const k of chaves) {
    const row = _idsCache[k];
    html += `<tr>
      <td>${k}</td>
      <td>${row.nome || '—'}</td>
      <td>${row.id}</td>
      <td><button class="btn-usar" onclick="usarId('${k.replace(/'/g,"\\'")}')">usar</button></td>
      <td><button class="btn-del" onclick="removeId('${k.replace(/'/g,"\\'")}')">✕</button></td>
    </tr>`;
  }
  html += '</tbody></table>';
  lista.innerHTML = html;
}

function usarId(ma) {
  setModo('ma');
  document.getElementById('ma').value = ma;
  checarIdSalvo();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  buscarDireto();
}

// ── Modos de busca ────────────────────────────────────────────
function setModo(modo) {
  document.getElementById('secao-ma').style.display   = modo === 'ma'   ? '' : 'none';
  document.getElementById('secao-nome').style.display = modo === 'nome' ? '' : 'none';
  document.getElementById('modo-ma').classList.toggle('modo-ativo', modo === 'ma');
  document.getElementById('modo-nome').classList.toggle('modo-ativo', modo === 'nome');
}

function filtrarNome() {
  const termo      = document.getElementById('busca-nome').value.trim().toLowerCase();
  const resultados = document.getElementById('nome-resultados');

  if (!termo) { resultados.innerHTML = ''; return; }

  const matches = Object.values(_idsCache || {}).filter(row =>
    (row.nome || '').toLowerCase().includes(termo)
  );

  if (!matches.length) {
    resultados.innerHTML = '<p class="hint-id novo">Nenhum produto encontrado no cache. Use o modo Por MA para cadastrar.</p>';
    return;
  }

  let html = '<div class="nome-lista">';
  for (const row of matches.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))) {
    html += `<div class="nome-item" onclick="usarId('${row.ma.replace(/'/g, "\\'")}')">
      <span class="nome-item-nome">${row.nome || '—'}</span>
      <span class="nome-item-ma">MA: ${row.ma}</span>
    </div>`;
  }
  html += '</div>';
  resultados.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────────
loadIds();
