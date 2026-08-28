// Verificação "existe/não existe" em sistemas estaduais de agrotóxico que expõem
// catálogo completo estático (sem sessão/AJAX/captcha) — ver docs/estaduais.md.
// Cada fonte é buscada uma vez e cacheada (muda pouco); a verificação por MA é local.
const https = require('https')
const cheerio = require('cheerio')
const { PDFParse } = require('pdf-parse')
const { createBoundedCache } = require('./boundedCache')
const { normMa } = require('./normalizer')

const CACHE_TTL = 24 * 60 * 60 * 1000
const cache     = createBoundedCache({ ttlMs: CACHE_TTL, maxEntries: 10 })
const UA        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

// --- RO: SIAFRO/IDARON — XML estático completo ---
async function listarRO() {
  const cached = cache.get('RO')
  if (cached) return cached
  const buf = await fetchBuffer('https://www.idaron.ro.gov.br/SIAFRO/XML/AGROTOXICOS.xml')
  const $ = cheerio.load(buf.toString('latin1'), { xmlMode: true })
  const produtos = []
  $('AGROTOXICO').each((_, el) => {
    const $el = $(el)
    produtos.push({
      ma:       normMa($el.find('NR_REGISTRO_MAPA').text()),
      nome:     $el.find('NM_MARCA_COMERCIAL').text().trim(),
      situacao: $el.find('DS_SITUACAO').text().trim(),
    })
  })
  cache.set('RO', produtos)
  return produtos
}

async function verificarRO(ma) {
  const alvo    = normMa(ma)
  const achado  = (await listarRO()).find(p => p.ma === alvo)
  return achado ? { encontrado: true, nome: achado.nome, situacao: achado.situacao } : { encontrado: false }
}

// --- GO: SIDAGO/Agrodefesa — HTML estático completo (tabela server-side) ---
async function listarGO() {
  const cached = cache.get('GO')
  if (cached) return cached
  const buf = await fetchBuffer('https://sidago.agrodefesa.go.gov.br/site/adicionaisproprios/agrotoxicos/agrotoxicos.php')
  const $ = cheerio.load(buf.toString('utf-8'))
  const produtos = []
  $('table.tablesorter > tbody > tr').not('.tablesorter-childRow').each((_, tr) => {
    const $tds = $(tr).children('td')
    if ($tds.length < 3) return
    produtos.push({
      ma:      normMa($tds.eq(1).text()),
      nome:    $tds.eq(0).text().trim(),
      titular: $tds.eq(2).text().trim(),
    })
  })
  cache.set('GO', produtos)
  return produtos
}

async function verificarGO(ma) {
  const alvo   = normMa(ma)
  const achado = (await listarGO()).find(p => p.ma === alvo)
  return achado ? { encontrado: true, nome: achado.nome, titular: achado.titular } : { encontrado: false }
}

// --- RN: IDIARN — PDF estático (relatório em texto, sem estrutura de tabela real).
// Heurística: procura o MA como token isolado seguido da classe toxicológica (I..IV),
// que é sempre a coluna seguinte no relatório. Não extrai nome (linhas não têm colunas
// delimitadas de forma confiável) — só confirma existência.
async function textoRN() {
  const cached = cache.get('RN')
  if (cached) return cached
  const buf     = await fetchBuffer('http://www.adcon.rn.gov.br/ACERVO/idiarn/DOC/DOC000000000168756.PDF')
  const parser  = new PDFParse({ data: buf })
  const { text } = await parser.getText()
  cache.set('RN', text)
  return text
}

async function verificarRN(ma) {
  const alvo = normMa(ma)
  if (!alvo) return { encontrado: false }
  const texto = await textoRN()
  const re    = new RegExp(`\\b${alvo}\\s+I{1,3}V?\\s`)
  return { encontrado: re.test(texto) }
}

// app.idaf.es.gov.br manda só o certificado folha, sem a intermediária da Let's
// Encrypt (confirmado com `openssl s_client -showcerts`) — Node recusa validar
// (UNABLE_TO_VERIFY_LEAF_SIGNATURE) onde curl/navegador toleram (fazem AIA chasing).
// Agent dedicado só pra esse host via `https` nativo — não afeta as outras fontes,
// que usam `fetch` normalmente.
const esAgent = new https.Agent({ rejectUnauthorized: false })

function getJson(url, agent) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent, headers: { 'User-Agent': UA }, timeout: 20_000 }, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} ao buscar ${url}`))
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => { try { resolve(JSON.parse(body.replace(/^﻿/, ''))) } catch (e) { reject(e) } })
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')) })
  })
}

// --- ES: IDAF/eIDAF — endpoint DataTables server-side (JSON, sem sessão/auth) ---
async function verificarES(ma) {
  const alvo = normMa(ma)
  if (!alvo) return { encontrado: false }
  const url = new URL('https://app.idaf.es.gov.br/eidaf/app-modulos/mod-institucional/gedsiv/inspecaofisc/agrotoxicos/consultapublica/controller_list_tbl_BD2.php')
  url.search = new URLSearchParams({
    produto: '', mapa: alvo, tox: '', amb: '', tit: '', cul: '', clas: '', ing: '',
    draw: '1', start: '0', length: '10',
  }).toString()
  const data = await getJson(url, esAgent)
  const row  = data.data?.[0]
  if (!row) return { encontrado: false }
  return { encontrado: true, nome: row[2], titular: row[3], classe: row[4] }
}

module.exports = { verificarRO, verificarGO, verificarRN, verificarES, normMa }
