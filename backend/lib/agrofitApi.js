const BASE = 'https://api.cnptia.embrapa.br/agrofit/v1'

async function buscarPorNome(nome) {
  const token = process.env.AGROFIT_API_TOKEN
  if (!token) return []
  try {
    const qs  = new URLSearchParams({ marca_comercial: nome, page: '1' })
    const res = await fetch(`${BASE}/search/produtos-formulados?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.warn('[agrofitApi] HTTP', res.status)
      return []
    }
    const data  = await res.json()
    const items = Array.isArray(data) ? data : (data.items ?? data.data ?? [])
    return items.map(item => ({
      ma:          item.numero_registro || '',
      nome:        Array.isArray(item.marca_comercial) ? (item.marca_comercial[0] || '') : (item.marca_comercial || ''),
      ingrediente: Array.isArray(item.ingrediente_ativo) ? item.ingrediente_ativo.join(', ') : (item.ingrediente_ativo || ''),
    }))
  } catch (err) {
    console.error('[agrofitApi]', err.message)
    return []
  }
}

module.exports = { buscarPorNome }
