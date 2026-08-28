import 'dotenv/config'

const BASE_URL = process.env.CELEPAR_API_BASE_URL
const USERNAME = process.env.CELEPAR_AGENT_USERNAME
const PASSWORD = process.env.CELEPAR_AGENT_PASSWORD

if (!BASE_URL) throw new Error('CELEPAR_API_BASE_URL não configurado (ver .env.example)')
if (!USERNAME || !PASSWORD) throw new Error('CELEPAR_AGENT_USERNAME/CELEPAR_AGENT_PASSWORD não configurados — rode "npm run setup-agent-account" primeiro')

let token = null

async function login() {
  const res  = await fetch(`${BASE_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: USERNAME, password: PASSWORD }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) throw new Error(`login da conta de serviço falhou: ${data?.error || res.status}`)
  token = data.token
}

// Token JWT expira em 8h (backend/routes/auth.js) — em caso de 401 faz um
// único retry após relogar, nunca entra em loop de retry.
async function request(method, path, { query, body } = {}) {
  if (!token) await login()

  const doFetch = async () => {
    const url = new URL(BASE_URL + path)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
      }
    }
    return fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  let res = await doFetch()
  if (res.status === 401) {
    await login()
    res = await doFetch()
  }

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status} em ${method} ${path}`)
  return data
}

export { request }
