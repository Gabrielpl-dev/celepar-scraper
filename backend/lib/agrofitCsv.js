const fs   = require('fs')
const path = require('path')

const CSV_URL    = 'https://dados.agricultura.gov.br/dataset/6c913699-e82e-4da3-a0a1-fb6c431e367f/resource/d30b30d7-e256-484e-9ab8-cd40974e1238/download/agrofitprodutosformulados.csv'
const CACHE_PATH = path.join(__dirname, '..', 'cache', 'agrofit_formulados.csv')
const TTL_MS     = 24 * 60 * 60 * 1000

let memCache   = null  // { rows, colMA, colNome, colIA, at }
let downloading = null // deduplicates concurrent download attempts

function normHeader(h) {
  return String(h)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function detectSep(line) {
  const semi  = (line.match(/;/g) || []).length
  const comma = (line.match(/,/g) || []).length
  return semi >= comma ? ';' : ','
}

function parseLine(line, sep) {
  const fields = []; let field = ''; let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { field += '"'; i++ } else inQ = !inQ
    } else if (c === sep && !inQ) { fields.push(field.trim()); field = '' }
    else field += c
  }
  fields.push(field.trim())
  return fields
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const found = headers.find(h => h === c || h.includes(c))
    if (found) return found
  }
  return null
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return null
  const sep     = detectSep(lines[0])
  const headers = parseLine(lines[0], sep).map(normHeader)
  const colMA   = findCol(headers, ['numero_registro', 'nr_registro', 'registro'])
  const colNome = findCol(headers, ['marca_comercial', 'nm_marca_comercial', 'nome_comercial', 'marca'])
  const colIA   = findCol(headers, ['ingrediente_ativo', 'ia', 'ingrediente', 'ativo'])
  if (!colMA || !colNome) {
    console.warn('[agrofitCsv] Colunas não encontradas. Headers:', headers.slice(0, 10))
    return null
  }
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i], sep)
    if (vals.length < 2) continue
    const obj = {}
    headers.forEach((h, j) => { obj[h] = vals[j] ?? '' })
    rows.push(obj)
  }
  return { rows, colMA, colNome, colIA }
}

async function download() {
  const dir = path.dirname(CACHE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  console.log('[agrofitCsv] Baixando CSV da Agrofit...')
  const res = await fetch(CSV_URL, {
    headers: { 'User-Agent': 'AgroCheck/1.0', Accept: 'text/csv,*/*' },
    signal: AbortSignal.timeout(120_000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`CSV Agrofit HTTP ${res.status}`)
  const text = await res.text()
  const parsed = parseCSV(text)
  if (!parsed) throw new Error('CSV Agrofit: formato não reconhecido')
  fs.writeFileSync(CACHE_PATH, text, 'utf8')
  memCache = { ...parsed, at: Date.now() }
  console.log(`[agrofitCsv] Carregados ${parsed.rows.length} produtos formulados`)
}

async function ensureCache() {
  if (memCache && Date.now() - memCache.at < TTL_MS) return

  try {
    const stat = fs.statSync(CACHE_PATH)
    if (Date.now() - stat.mtimeMs < TTL_MS) {
      const text   = fs.readFileSync(CACHE_PATH, 'utf8')
      const parsed = parseCSV(text)
      if (parsed) { memCache = { ...parsed, at: stat.mtimeMs }; return }
    }
  } catch (_) {}

  if (!downloading) downloading = download().finally(() => { downloading = null })
  await downloading
}

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

async function buscarPorNome(nome) {
  try { await ensureCache() } catch (err) {
    console.error('[agrofitCsv]', err.message)
    return []
  }
  if (!memCache?.rows?.length) return []
  const { rows, colMA, colNome, colIA } = memCache
  const n = norm(nome)
  return rows
    .filter(r => norm(r[colNome]).includes(n))
    .slice(0, 20)
    .map(r => ({ ma: r[colMA] || '', nome: r[colNome] || '', ingrediente: colIA ? (r[colIA] || '') : '' }))
}

function status() {
  if (!memCache) return { ok: false, total: 0 }
  return { ok: true, total: memCache.rows.length, at: new Date(memCache.at).toISOString() }
}

// Inicia download em background ao carregar o módulo
ensureCache().catch(err => console.warn('[agrofitCsv] Background init:', err.message))

module.exports = { buscarPorNome, ensureCache, status }
