// ---------- nav ----------
document.querySelectorAll('.op').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.op').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const op = btn.dataset.op;
    document.querySelectorAll('section[data-panel]').forEach(s => {
      s.hidden = s.dataset.panel !== op;
    });
  });
});

// ---------- helpers ----------
function getParams() {
  return {
    Cod: document.getElementById('paramCod').value.trim(),
    descIngrediente: document.getElementById('paramDesc').value.trim()
  };
}

function setStatus(id, kind, msg, count, took) {
  const el = document.getElementById('status-' + id);
  if (kind === 'loading') {
    el.outerHTML = `<div id="status-${id}" class="status loading"><span class="spinner"></span> ${msg}</div>`;
  } else {
    const countHtml = count != null ? `<span class="count">${count}</span> resultado(s)` : '';
    const timeHtml  = took  != null ? `<span class="time">${took}ms</span>` : '';
    el.outerHTML = `<div id="status-${id}" class="status ${kind}">${msg} ${countHtml} ${timeHtml}</div>`;
  }
}

async function call(endpoint, body, method = 'POST') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api/' + endpoint, opts);
  return r.json();
}

// ---------- api layer (React-ready: copy to src/services/api.js) ----------
const api = {
  extrairCultura: (cultura, params) => call('extrair-cultura', { cultura, params }),
  buscarSiagro:   (siagro, params)  => call('buscar-siagro', { siagro, params }),
  comparar:       (c1, c2, params)  => call('comparar', { cultura1: c1, cultura2: c2, params }),
  verificar:      (termo, params)   => call('verificar', { termo, params }),
  listar:         (params)          => fetch('/api/listar?' + new URLSearchParams(params)).then(r => r.json()),
};

function downloadCSV(filename, rows) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const csvEsc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;

function tableHTML(headers, rowsHTML, toolbar = '') {
  return `
    <div class="results-toolbar">${toolbar}</div>
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>`;
}

// ---------- EXTRAIR ----------
async function runExtrair() {
  const cultura = document.getElementById('extCultura').value.trim();
  setStatus('extrair', 'loading', 'consultando celepar...');
  const t0 = performance.now();
  try {
    const data = await api.extrairCultura(cultura, getParams());
    const took = Math.round(performance.now() - t0);
    if (!data.ok) throw new Error(data.error);
    const rows = data.rows.map((r, i) => `
      <tr>
        <td>${r.cultura}</td>
        <td><span class="siagro-pill">${r.siagro}</span></td>
        <td>${r.alvo}</td>
        <td style="text-align:center"><input type="checkbox" data-idx="${i}"></td>
      </tr>`).join('');
    const toolbar = `
      <button class="ghost" onclick='exportExtrair(${JSON.stringify(data.rows).replace(/'/g, '&apos;')})'>↓ exportar csv</button>
      <span style="color:var(--dim);font-size:11px">cultura: <b style="color:var(--text)">${data.cultura}</b></span>`;
    const el = document.getElementById('result-extrair');
    el.hidden = false;
    el.innerHTML = data.rows.length
      ? tableHTML(['Cultura', 'SIAGRO', 'Alvo', '✓'], rows, toolbar)
      : `<div class="empty-state">Nenhum registro para <code>${cultura}</code>.</div>`;
    setStatus('extrair', 'ok', 'sucesso —', data.total, took);
  } catch (e) {
    setStatus('extrair', 'err', 'erro: ' + e.message);
  }
}
function exportExtrair(rows) {
  const csv = ['Cultura,SIAGRO,Alvo', ...rows.map(r => [r.cultura, r.siagro, r.alvo].map(csvEsc).join(','))];
  downloadCSV('extrair_cultura.csv', csv);
}

// ---------- SIAGRO ----------
async function runSiagro() {
  const siagro = document.getElementById('siagroAlvo').value.trim();
  if (!siagro) return alert('informe o SIAGRO');
  setStatus('siagro', 'loading', 'consultando celepar...');
  const t0 = performance.now();
  try {
    const data = await api.buscarSiagro(siagro, getParams());
    const took = Math.round(performance.now() - t0);
    if (!data.ok) throw new Error(data.error);
    const rows = data.rows.map(r => `
      <tr>
        <td>${r.cultura}</td>
        <td><span class="siagro-pill">${r.siagro}</span></td>
        <td>${r.alvo}</td>
      </tr>`).join('');
    const toolbar = `
      <button class="ghost" onclick='exportSiagro(${JSON.stringify(data.rows).replace(/'/g, '&apos;')})'>↓ exportar csv</button>
      <span style="color:var(--dim);font-size:11px">siagro: <b style="color:var(--text)">${data.siagro}</b></span>`;
    const el = document.getElementById('result-siagro');
    el.hidden = false;
    el.innerHTML = data.rows.length
      ? tableHTML(['Cultura', 'SIAGRO', 'Alvo'], rows, toolbar)
      : `<div class="empty-state">SIAGRO <code>${siagro}</code> não encontrado.</div>`;
    setStatus('siagro', 'ok', 'sucesso —', data.total, took);
  } catch (e) {
    setStatus('siagro', 'err', 'erro: ' + e.message);
  }
}
function exportSiagro(rows) {
  const csv = ['SIAGRO,Cultura,Alvo', ...rows.map(r => [r.siagro, r.cultura, r.alvo].map(csvEsc).join(','))];
  downloadCSV('busca_siagro.csv', csv);
}

// ---------- COMPARAR ----------
async function runComparar() {
  const c1 = document.getElementById('cmpC1').value.trim();
  const c2 = document.getElementById('cmpC2').value.trim();
  if (!c1 || !c2) return alert('informe as duas culturas');
  setStatus('comparar', 'loading', 'consultando celepar...');
  const t0 = performance.now();
  try {
    const data = await api.comparar(c1, c2, getParams());
    const took = Math.round(performance.now() - t0);
    if (!data.ok) throw new Error(data.error);

    const renderList = (items, fmt) => items.length
      ? items.map(fmt).join('')
      : '<div class="empty">(nenhum)</div>';

    const html = `
      <div class="cmp-grid">
        <div class="cmp-box exclusivo1">
          <h4>Exclusivos · ${c1} <span class="count">${data.exclusivos1.length}</span></h4>
          <div class="cmp-list">
            ${renderList(data.exclusivos1, r => `<div class="item"><span class="siagro-pill">${r.siagro}</span> ${r.alvo}</div>`)}
          </div>
        </div>
        <div class="cmp-box exclusivo2">
          <h4>Exclusivos · ${c2} <span class="count">${data.exclusivos2.length}</span></h4>
          <div class="cmp-list">
            ${renderList(data.exclusivos2, r => `<div class="item"><span class="siagro-pill">${r.siagro}</span> ${r.alvo}</div>`)}
          </div>
        </div>
        <div class="cmp-box comum">
          <h4>Comuns às duas <span class="count">${data.comuns.length}</span></h4>
          <div class="cmp-list">
            ${renderList(data.comuns, r => `
              <div class="item">
                <span class="siagro-pill">${r.siagro}</span>
                <div style="color:var(--dim);font-size:11px;margin-left:4px">${c1}: ${r.alvo1}</div>
                <div style="color:var(--dim);font-size:11px;margin-left:4px">${c2}: ${r.alvo2}</div>
              </div>`)}
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <button class="ghost" onclick='exportComparar(${JSON.stringify(data).replace(/'/g, '&apos;')})'>↓ exportar csv unificado</button>
      </div>
    `;
    const el = document.getElementById('result-comparar');
    el.hidden = false;
    el.innerHTML = html;
    setStatus('comparar', 'ok',
      `${c1}: ${data.total1} · ${c2}: ${data.total2} · diff:`,
      data.exclusivos1.length + data.exclusivos2.length, took);
  } catch (e) {
    setStatus('comparar', 'err', 'erro: ' + e.message);
  }
}
function exportComparar(d) {
  const lines = ['Categoria,SIAGRO,Cultura,Alvo'];
  d.exclusivos1.forEach(r => lines.push(['Exclusivo_1', r.siagro, d.cultura1, r.alvo].map(csvEsc).join(',')));
  d.exclusivos2.forEach(r => lines.push(['Exclusivo_2', r.siagro, d.cultura2, r.alvo].map(csvEsc).join(',')));
  d.comuns.forEach(r =>
    lines.push(['Comum', r.siagro, `${d.cultura1} | ${d.cultura2}`, `${r.alvo1} | ${r.alvo2}`].map(csvEsc).join(',')));
  downloadCSV('comparar.csv', lines);
}

// ---------- VERIFICAR ----------
async function runVerificar() {
  const termo = document.getElementById('verTermo').value.trim();
  if (!termo) return alert('informe o termo');
  setStatus('verificar', 'loading', 'consultando celepar...');
  const t0 = performance.now();
  try {
    const data = await api.verificar(termo, getParams());
    const took = Math.round(performance.now() - t0);
    if (!data.ok) throw new Error(data.error);

    const rows = data.rows.map(r => {
      const cls = r.cor === 'green' ? 'badge-green' : r.cor === 'red' ? 'badge-red' : '';
      return `
        <tr>
          <td>${r.nome}</td>
          <td class="${cls}">${r.situacao}</td>
          <td style="color:var(--dim)">${r.classificacao}</td>
          <td style="color:var(--dim)">${r.empresa}</td>
        </tr>`;
    }).join('');

    const el = document.getElementById('result-verificar');
    el.hidden = false;
    el.innerHTML = data.rows.length
      ? tableHTML(['Produto', 'Situação', 'Classificação Tox', 'Empresa'], rows,
          `<span style="color:var(--dim);font-size:11px">termo: <b style="color:var(--text)">${termo}</b></span>`)
      : `<div class="empty-state">Nenhum produto com <code>${termo}</code> encontrado.</div>`;
    setStatus('verificar', 'ok', 'sucesso —', data.total, took);
  } catch (e) {
    setStatus('verificar', 'err', 'erro: ' + e.message);
  }
}

// ---------- RAW ----------
async function runRaw() {
  setStatus('raw', 'loading', 'consultando celepar...');
  const t0 = performance.now();
  try {
    const data = await api.listar(getParams());
    const took = Math.round(performance.now() - t0);
    if (!data.ok) throw new Error(data.error);
    const rows = data.rows.slice(0, 500).map(r => `
      <tr>
        <td>${r.cultura}</td>
        <td><span class="siagro-pill">${r.siagro}</span></td>
        <td>${r.alvo}</td>
        <td>${r.produtos.map(p => {
          const c = p.cor === 'red' ? 'var(--red)' : p.cor === 'green' ? 'var(--green)' : 'var(--dim)';
          return `<span style="color:${c}">${p.nome}</span>`;
        }).join(' · ')}</td>
      </tr>`).join('');
    const el = document.getElementById('result-raw');
    el.hidden = false;
    el.innerHTML = data.rows.length
      ? tableHTML(['Cultura', 'SIAGRO', 'Alvo', 'Produtos (cor)'], rows,
          `<span style="color:var(--dim);font-size:11px">primeiras 500 linhas · url: <a href="${data.url}" target="_blank" style="color:var(--accent-2)">abrir original ↗</a></span>`)
      : `<div class="empty-state">Nada retornado.</div>`;
    setStatus('raw', 'ok', 'sucesso —', data.total, took);
  } catch (e) {
    setStatus('raw', 'err', 'erro: ' + e.message);
  }
}
