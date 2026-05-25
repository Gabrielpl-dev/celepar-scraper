async function call(endpoint, body, method = 'POST') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch('/api/' + endpoint, opts)
  return r.json()
}

export const api = {
  extrairCultura:   (cultura, params)    => call('extrair-cultura', { cultura, params }),
  cccbCulturas:     ()                   => call('cccb/culturas', null, 'GET'),
  cccbBuildMapping: (params)             => call('cccb/build-mapping', { params }),
  cccb:             (culturaid, params)  => call('cccb', { culturaid, params }),
  buscarSiagro:   (siagro, params)  => call('buscar-siagro', { siagro, params }),
  comparar:       (c1, c2, params)  => call('comparar', { cultura1: c1, cultura2: c2, params }),
  verificar:      (termo, params)   => call('verificar', { termo, params }),
  listar:         (params)          => fetch('/api/listar?' + new URLSearchParams(params)).then(r => r.json()),
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
