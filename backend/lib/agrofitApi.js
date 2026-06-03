const BASE      = 'https://api.cnptia.embrapa.br'
const TOKEN_URL = `${BASE}/token`

let _token     = null
let _expiresAt = 0

async function fetchToken() {
  const user   = process.env.AGROFIT_USER
  const pass   = process.env.AGROFIT_PASSWORD
  const key    = process.env.AGROFIT_KEY
  const secret = process.env.AGROFIT_SECRET
  if (!key || !secret) return null

  const basic = Buffer.from(`${key}:${secret}`).toString('base64')
  try {
    const res = await fetch(TOKEN_URL, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:   'grant_type=client_credentials',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) { console.warn('[agrofitApi] token HTTP', res.status); return null }
    const data = await res.json()
    _token     = data.access_token
    _expiresAt = Date.now() + (data.expires_in - 60) * 1000
    return _token
  } catch (err) {
    console.error('[agrofitApi] fetchToken:', err.message)
    return null
  }
}

async function getToken() {
  if (_token && Date.now() < _expiresAt) return _token
  return fetchToken()
}

async function buscarPorNome(nome) {
  const token = await getToken()
  if (!token) return []
  try {
    const qs  = new URLSearchParams({ marca_comercial: nome })
    const res = await fetch(`${BASE}/agrofit/v1/search/produtos-formulados?${qs}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      if (res.status === 401) { _token = null; _expiresAt = 0 }
      console.warn('[agrofitApi] buscar HTTP', res.status)
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

async function buscarDocumentos(ma) {
  const token = await getToken()
  if (!token) return null
  try {
    const res = await fetch(`${BASE}/agrofit/v1/produtos-formulados/${encodeURIComponent(ma)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      if (res.status === 401) { _token = null; _expiresAt = 0 }
      return null
    }
    const data = await res.json()
    const item = Array.isArray(data) ? data[0] : data
    if (!item || !item.numero_registro) return null
    return {
      ma:          item.numero_registro || ma,
      nome:        Array.isArray(item.marca_comercial) ? (item.marca_comercial[0] || '') : (item.marca_comercial || ''),
      ingrediente: Array.isArray(item.ingrediente_ativo) ? item.ingrediente_ativo.join(', ') : (item.ingrediente_ativo || ''),
      titular:     item.titular_registro || '',
      documentos:  (item.documento_cadastrado || []).map(d => ({
        tipo:     d.tipo_documento || '',
        descricao: d.descricao || '',
        url:      d.url || '',
        origem:   d.origem || '',
        data:     d.data_inclusao || '',
      })),
    }
  } catch (err) {
    console.error('[agrofitApi] buscarDocumentos:', err.message)
    return null
  }
}

module.exports = { buscarPorNome, buscarDocumentos }
