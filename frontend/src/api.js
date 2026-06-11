function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function call(endpoint, body, method = 'POST') {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch('/api/' + endpoint, opts)
  if (r.status === 401) {
    localStorage.removeItem('token')
    window.location.reload()
    return
  }
  return r.json()
}

export const api = {
  extrairCultura:      (cultura, params)   => call('extrair-cultura', { cultura, params }),
  sincronizarCulturas: ()                  => call('culturas/sincronizar', {}),
  cccbCulturas:        ()                  => call('cccb/culturas', null, 'GET'),
  cccbBuildMapping:    (params)            => call('cccb/build-mapping', { params }),
  cccb:                (culturaid, params, enrichLinkea = false) => call('cccb', { culturaid, params, enrichLinkea }),
  agrofitDocs:      (ma)             => call('agrofit-docs?ma=' + encodeURIComponent(ma), null, 'GET'),
  buscarProduto:    (nome)           => call('buscar-produto?nome=' + encodeURIComponent(nome), null, 'GET'),
  verificarProduto: (nome, ma)  => call(
    'verificar-produto?nome=' + encodeURIComponent(nome) +
    (ma ? '&ma=' + encodeURIComponent(ma) : ''),
    null, 'GET'
  ),
  linkCod: (ma, cod) => call('agrofit-ids/link-cod', { ma, cod }),
  buscarSiagro:   (siagro, params)  => call('buscar-siagro', { siagro, params }),
  comparar:       (c1, c2, params)  => call('comparar', { cultura1: c1, cultura2: c2, params }),
  verificar:      (termo, params)   => call('verificar', { termo, params }),
  listar:         (params)          => fetch('/api/listar?' + new URLSearchParams(params), { headers: authHeaders() }).then(r => {
    if (r.status === 401) { localStorage.removeItem('token'); window.location.reload(); return }
    return r.json()
  }),
}

export function downloadCSV(filename, rows) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const csvEsc = s => `"${String(s ?? '').replace(/"/g, '""')}"`
