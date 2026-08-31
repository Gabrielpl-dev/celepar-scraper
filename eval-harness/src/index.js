// Bate uma bateria de casos reais contra a API do AgroCheck em loop, comparando cada
// resposta contra um gabarito capturado anteriormente -- pensado especificamente pra pegar
// regressão SILENCIOSA (a rota continua respondendo 200 OK, mas o conteúdo mudou) que um
// refactor como o desacoplamento de banco.js poderia introduzir sem crashar nada.
//
// `npm run capturar-gabarito` grava a resposta de hoje em gabarito/<caso>.json (rodar
// ANTES de deployar uma mudança, contra o código que já está em produção). Depois disso,
// `npm start` roda pra sempre, comparando cada rodada contra esse gabarito e logando
// (stdout, uma linha JSON por evento -- pensado pra ir direto pro log do PM2).
import 'dotenv/config'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { CASOS } from './casos.js'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const GABARITO_DIR = join(__dirname, '..', 'gabarito')

const BASE_URL      = process.env.CELEPAR_API_BASE_URL || 'http://140.238.238.172:3000'
const USERNAME      = process.env.CELEPAR_EVAL_USERNAME
const PASSWORD      = process.env.CELEPAR_EVAL_PASSWORD
const INTERVAL_MS   = Number(process.env.EVAL_INTERVAL_MIN || 10) * 60_000
const TEMPO_LENTO_MS = 5000 // acima disso, loga aviso (ver histórico de ORA-12170 no .envs/infra.md)

if (!USERNAME || !PASSWORD) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), tipo: 'erro-fatal', mensagem: 'CELEPAR_EVAL_USERNAME/PASSWORD não configurados -- rode npm run setup-agent-account primeiro' }))
  process.exit(1)
}

let token = null

async function login() {
  const r = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  })
  const data = await r.json().catch(() => null)
  if (!r.ok || !data?.ok) throw new Error(`login falhou: ${data?.error ?? r.status}`)
  token = data.token
}

// Executa um caso, com 1 retry automático se o token expirou (401) -- JWT dura 8h,
// então isso acontece naturalmente entre rodadas se o intervalo for longo o bastante.
async function chamar(caso, jaTentouRelogar = false) {
  const t0 = Date.now()
  try {
    const r = await fetch(`${BASE_URL}${caso.caminho}`, {
      method: caso.metodo,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: caso.body ? JSON.stringify(caso.body) : undefined,
    })
    if (r.status === 401 && !jaTentouRelogar) {
      await login()
      return chamar(caso, true)
    }
    const tempoMs = Date.now() - t0
    const json    = await r.json().catch(() => null)
    return { status: r.status, json, tempoMs }
  } catch (err) {
    return { status: null, json: null, tempoMs: Date.now() - t0, erroRede: err.message }
  }
}

function caminhoGabarito(nome) {
  return join(GABARITO_DIR, `${nome}.json`)
}

function lerGabarito(nome) {
  const p = caminhoGabarito(nome)
  if (!existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null }
}

// Comparação estrutural simples (chave a chave, recursiva) -- devolve a lista de
// caminhos que divergiram, ou [] se bateu. JSON.stringify puro seria mais estrito
// demais (ordem de chave de objeto não deveria importar, e não importa aqui porque
// vem do mesmo código gerando os dois lados -- mas melhor comparar valor, não string).
function diferencas(a, b, caminho = '$') {
  if (a === b) return []
  if (typeof a !== typeof b) return [caminho]
  if (a === null || b === null) return [caminho]
  if (typeof a !== 'object') return [caminho]
  if (Array.isArray(a) !== Array.isArray(b)) return [caminho]

  if (Array.isArray(a)) {
    if (a.length !== b.length) return [`${caminho} (tamanho ${a.length} -> ${b.length})`]
    return a.flatMap((v, i) => diferencas(v, b[i], `${caminho}[${i}]`))
  }

  const chaves = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...chaves].flatMap(k => diferencas(a[k], b[k], `${caminho}.${k}`))
}

async function rodarBateria() {
  const resultados = []
  for (const caso of CASOS) {
    const { status, json, tempoMs, erroRede } = await chamar(caso)
    const gabarito = lerGabarito(caso.nome)
    const diffs    = gabarito ? diferencas(gabarito, json) : null
    const evento = {
      ts:          new Date().toISOString(),
      caso:        caso.nome,
      status,
      tempoMs,
      lento:       tempoMs > TEMPO_LENTO_MS,
      erroRede:    erroRede ?? null,
      semGabarito: gabarito === null,
      bateuGabarito: gabarito === null ? null : diffs.length === 0,
      diffs:       diffs && diffs.length ? diffs.slice(0, 10) : undefined,
      // ORA-12170 e afins ficam explícitos no log -- padrão de falha já documentado
      // em .envs/infra.md, é o primeiro suspeito quando algo pisca.
      oraCode:     json?.code?.startsWith?.('ORA-') ? json.code : undefined,
    }
    console.log(JSON.stringify(evento))
    resultados.push(evento)
  }

  const resumo = {
    ts:   new Date().toISOString(),
    tipo: 'resumo',
    total: resultados.length,
    bateram:    resultados.filter(r => r.bateuGabarito === true).length,
    divergiram: resultados.filter(r => r.bateuGabarito === false).length,
    semGabarito: resultados.filter(r => r.semGabarito).length,
    erros:      resultados.filter(r => r.erroRede || (r.status && r.status >= 500)).length,
    lentos:     resultados.filter(r => r.lento).length,
  }
  console.log(JSON.stringify(resumo))
}

// --casos=nome1,nome2 filtra quais gravar -- útil pra recapturar só uma rota nova
// (ex: depois de confirmar visualmente que ela ficou certa) sem sobrescrever o gabarito
// bom das rotas já existentes com a resposta do código NOVO (que é justamente o que
// estamos tentando conferir, não redefinir como "certo" de cara).
async function capturarGabarito(filtroNomes) {
  mkdirSync(GABARITO_DIR, { recursive: true })
  await login()
  const casos = filtroNomes ? CASOS.filter(c => filtroNomes.includes(c.nome)) : CASOS
  for (const caso of casos) {
    const { status, json, erroRede } = await chamar(caso)
    if (erroRede || status >= 500) {
      console.error(`[capturar-gabarito] ${caso.nome}: falhou (status=${status}, erro=${erroRede}) -- não gravado, gabarito antigo (se existir) fica intocado`)
      continue
    }
    writeFileSync(caminhoGabarito(caso.nome), JSON.stringify(json, null, 2), 'utf8')
    console.log(`[capturar-gabarito] ${caso.nome}: gravado (status ${status})`)
  }
}

async function main() {
  if (process.argv.includes('--capturar-gabarito')) {
    const argCasos = process.argv.find(a => a.startsWith('--casos='))
    await capturarGabarito(argCasos ? argCasos.slice('--casos='.length).split(',') : null)
    return
  }

  await login()
  console.log(JSON.stringify({ ts: new Date().toISOString(), tipo: 'inicio', baseUrl: BASE_URL, intervaloMin: INTERVAL_MS / 60_000, casos: CASOS.length }))
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await rodarBateria()
    await new Promise(r => setTimeout(r, INTERVAL_MS))
  }
}

main().catch(err => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), tipo: 'erro-fatal', mensagem: err.message }))
  process.exitCode = 1
})
