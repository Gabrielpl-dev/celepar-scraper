// node ouro_safra_comparar.js
// Saída: errados_banco_celepar.csv no mesmo diretório.

const fs       = require('fs')
const path     = require('path')
const backendMod = path.join(__dirname, 'backend', 'node_modules')
const oracledb = require(path.join(backendMod, 'oracledb'))
const cheerio  = require(path.join(backendMod, 'cheerio'))

// ── Scraper (inline) ──────────────────────────────────────────────────────────

const BASE_URL     = 'https://celepar07web.pr.gov.br/agrotoxicos/listar.asp'
const PESQUISA_URL = 'https://celepar07web.pr.gov.br/agrotoxicos/resultadoPesquisa.asp'

const norm    = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const normSep = s => norm(s).replace(/[/;|]+/g, ' ').replace(/\s+/g, ' ').trim()

function buildUrl(Cod) {
  const defaults = {
    Cod, descIngrediente: '',
    CodIngredienteAtivo: 'null', CodFormulacao: 'null', IdRegistrante: 'null',
    CodFormaAcao: 'null', CodAlvo: 'null', CodGrupoQuimico: 'null',
    CodClassToxicologica: 'null', CodSituacao: 'null', CodClassificacao: 'null',
    CodEspecie: 'null', CodAgrotoxico: 'null', NumeroRegistro: 'null',
    expurgo: 'null', aplica: 'null', tratam: 'null', ClassificacaoQuiBio: 'null',
    criterioAgrotoxico: '', criterioIngredienteAtivo: '', criterioRegistrante: '',
    criterioClassificacaoToxicologica: '', criterioPraga: '', criterioSituacao: '',
    criterioClasse: '', criterioCulturaInfestada: '', criterioExpurgo: '',
    criterioAplicacaoAerea: '', criterioTratamentoSementes: ''
  }
  const qs = Object.entries(defaults).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`).join('&')
  return `${BASE_URL}?${qs}`
}

async function fetchHtml(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded' },
  }
  if (body) opts.body = body
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  try { return new TextDecoder('windows-1252').decode(buf) }
  catch { return buf.toString('latin1') }
}

async function fetchPesquisa() {
  const body = new URLSearchParams({
    criterioAgrotoxico: '', criterioIngredienteAtivo: '', criterioRegistrante: '',
    criterioClassificacaoToxicologica: '', criterioPraga: '', criterioSituacao: '',
    criterioClasse: '', criterioCulturaInfestada: '', criterioExpurgo: '',
    criterioAplicacaoAerea: '', criterioTratamentoSementes: '',
    select11: 'null', select1: '', select5: 'null', select4: 'null',
    select9: 'null', select6: 'null', select3: 'null', select7: 'null',
    descIngrediente: '', numeroRegistro: '', ClassificacaoQuiBio: '',
    submit1: 'Pesquisar'
  }).toString()
  return fetchHtml(PESQUISA_URL, 'POST', body)
}

function parsePesquisaRows(html) {
  const $ = cheerio.load(html)
  const rows = []
  $('table#tb1 tr').slice(1).each((_, tr) => {
    const tds  = $(tr).find('td')
    if (tds.length < 4) return
    const link = $(tds[0]).find('a').first()
    const nome = link.text().trim()
    if (!nome) return
    const cod  = (link.attr('href') || '').match(/[?&]Cod=(\d+)/)?.[1] ?? null
    rows.push({ nome, cod })
  })
  return rows
}

function parseRows(html) {
  const $ = cheerio.load(html)
  const linhas = []
  $('tr').each((_, tr) => {
    const $tds = $(tr).children('td')
    if ($tds.length < 4) return
    const $a = $tds.eq(0).find('a').first()
    if (!$a.length) return
    const m = ($a.attr('onclick') || '').match(/Cod2=(\d+)/)
    if (!m) return
    linhas.push({ cultura: $a.text().trim(), siagro: m[1] })
  })
  return linhas
}

// ── Oracle ────────────────────────────────────────────────────────────────────

try { oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_15' }) }
catch (_) {}

async function oracleConn() {
  const conn = await oracledb.getConnection({
    user:          process.env.ORACLE_USER,
    password:      process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  })
  await conn.execute('ALTER SESSION SET CURRENT_SCHEMA = VIASOFT')
  return conn
}

async function loadDescricoes(conn) {
  const r = await conn.execute(
    `SELECT DISTINCT DESCRICAO FROM RECEITPADRAO WHERE ATIVO = 'S'`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
  )
  return r.rows.map(r => r.DESCRICAO)
}

function lenRatio(a, b) {
  return Math.min(a.length, b.length) / Math.max(a.length, b.length)
}

function matchesPart(descricao, n) {
  const parts = descricao.split('/').map(p => norm(p.trim())).filter(p => p.length >= 4)
  return parts.some(p => {
    if (p === n) return true
    if (lenRatio(p, n) < 0.7) return false
    return n.startsWith(p + ' ') || p.startsWith(n + ' ')
  })
}

function findDescricao(descricoes, nome) {
  const n = norm(nome)
  const exact = descricoes.find(d => norm(d) === n)
  if (exact) return exact
  const prefix = descricoes
    .filter(d => {
      const dn = norm(d)
      return dn.length >= 4 && lenRatio(n, dn) >= 0.7 && (n.startsWith(dn + ' ') || dn.startsWith(n + ' '))
    })
    .sort((a, b) => b.length - a.length)[0]
  if (prefix) return prefix
  return descricoes.find(d => matchesPart(d, n)) ?? null
}

function findCandidatos(descricoes, nome) {
  const n = norm(nome)
  const words = n.split(' ').filter(Boolean)
  return descricoes
    .filter(d => words.some(w => w.length >= 4 && norm(d).includes(w)))
    .slice(0, 5)
}

async function getOracleRegistros(conn, descricao) {
  const r = await conn.execute(
    `SELECT DISTINCT d.SIAGROALV, c.NOME AS CULTURA
     FROM RECEITPADRAO r
     JOIN CULTURA     c ON r.CULTURAID     = c.CULTURAID
     JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
     WHERE r.DESCRICAO = :descricao AND r.ATIVO = 'S'`,
    { descricao },
    { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
  )
  return r.rows
}

// ── Produtos ──────────────────────────────────────────────────────────────────

const PRODUTOS = [
  'ABSOLUTO FIX','DORAI','KEYRA','XEQUE MATE HT','OFF ROAD','BASAGRAN 600',
  'FROWNCIDE 750 HT','CURZATE BR','FUSAO EC','MAGNUM 970SG','SUGOY','VIOVAN',
  'SPOT SC','APROACH POWER','BRIGHT','2,4D AMINOL 806','UNIZEB GOLD',
  'TRIGGER 240 SC','PIRATE','ALMADA','MANCOZEB CCAB 750 WG','BLINDADO TOV',
  'MEES','LOYER SL','CLOPANTO','IHAROL GOLD','ZETANIL','ACROSS','BLOWOUT',
  'OLEO MIN ASSIST','FEZAN GOLD SC','ARMERO BR','GLI-UP 720 WG','VIANCE',
  'VESSARYA','BELYAN','TUTOR','SONDA HT','FINALE SL200','BLAVITY',
  'KASAN MAX 750 WG','SOLDIER 720WG','ORDINAL 250 TM SL','FEZAN GOLD',
  'ORANIS SC','GIFT 400 OD','APROACH PREMIUM','CCAB 240 SC','ABADIN 72 EC',
  'EXPEDITION','GALIL SC','MELYRA','TOTALIT','ERRADICUR MAX TM 430SC',
  'GLUFOSINATO CCAB 200 SL','LANNATE BR','MONCUT','VERSATILIS','PARRUDOBR',
  '2,4D MIRANT','ENLIST COLEX - D','KRATON 100 EC','DITOR 250EC',
  'PLATINUM NEO','OPERA','ZEUS','ACROBAT MZ','ARADDO','APPROVE','EFFICON',
  'ELEITTO','MAXSAN','VERISMO','GLUCARE','REGENT DUO','JUDOKA SUPER 250CS',
  'DIFERE','PATRIOTA','VERDICT ULTRA','MIDAS BR','TEBURAZ',
  'ORKESTRA SC','MIBELYA','NOMOLT 150','ACAPELA','HAMPTON 400EC',
  'INTREPID 240 SC','ZAMPRO','IMUNIT','GAMONIUM','FASTAC DUO','CERTEZA N',
  'NORTOX','DOTTE','ABACUS HC','CERCOBIN 875 WG','HEAT','PRIVILEGE',
  'STANDAK TOP','AMPLO','GAPPER EC','YAMATO SC','FLUAZINAM NORTOX 500 SC',
  'SEIV','ACADEMIC WP','AZIMUT','APICE','FORUM','IMPARBR','FALCON','AUDAZ',
  'MAGMA 500 SC','CABRIO TOP','COFENRIN 400EC','COMPLETTO','CERIMONIA 250EC',
  'MAGIC','PASTOR','NORTOX MAX','CCAB 100 EC','VIVANTHA','CALARIS','PACTO TM',
  'FASTAC 100CE','COMET','TERMINUS','TERRAD O R 339 SC','LISOR 500 SC',
  'PONTEIROBR 500SC','ELEVORE SC','EXALT','SEMPRA','LANEX 800 WG',
  'TRIZEB 445 SC','DELEGATE','MILHA 600 WG','DURAVEL',
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Carregando lista do CELEPAR...')
  const todosNomes = parsePesquisaRows(await fetchPesquisa())
  console.log(`${todosNomes.length} produtos no CELEPAR.\n`)

  let conn
  try {
    conn = await oracleConn()
    console.log('Conectado ao Oracle.\n')
  } catch (e) {
    console.error('Falha ao conectar Oracle:', e.message)
    process.exit(1)
  }

  console.log('Carregando descricoes do Oracle...')
  const descricoes = await loadDescricoes(conn)
  console.log(`${descricoes.length} descricoes no Oracle.\n`)

  const errados = []

  for (let i = 0; i < PRODUTOS.length; i++) {
    const nome   = PRODUTOS[i]
    const prefix = `[${String(i + 1).padStart(3)}/${PRODUTOS.length}] ${nome}`

    try {
      const descricao = findDescricao(descricoes, nome)
      if (!descricao) {
        console.log(`${prefix} → não cadastrado`)
        continue
      }

      const oracleRows = await getOracleRegistros(conn, descricao)
      if (!oracleRows.length) {
        console.log(`${prefix} → não cadastrado`)
        continue
      }

      const n     = norm(nome)
      const match = todosNomes.find(r =>
        r.cod &&
        norm(r.nome).length >= 4 &&
        (norm(r.nome) === n || norm(r.nome).includes(n) || n.includes(norm(r.nome)))
      )
      if (!match) { console.log(`${prefix} → não encontrado no CELEPAR`); continue }

      const celeparHtml = await fetchHtml(buildUrl(match.cod))
      const celeparSets = {}
      for (const r of parseRows(celeparHtml)) {
        const k = normSep(r.cultura)
        if (!celeparSets[k]) celeparSets[k] = new Set()
        celeparSets[k].add(String(r.siagro))
      }

      if (Object.keys(celeparSets).length === 0) {
        console.log(`${prefix} → não cadastrado`)
        continue
      }

      const tokenize = s => {
        const n = String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        return new Set(n.replace(/[^a-z0-9 ]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(Boolean))
      }
      const jaccard = (a, b) => {
        const sa = tokenize(a), sb = tokenize(b)
        const inter = [...sa].filter(w => sb.has(w)).length
        return inter / new Set([...sa, ...sb]).size
      }
      const CULTURA_ALIASES = { 'pastagem': 'pastagens', 'pinus': 'pinus sp' }
      const resolveKey = cn => {
        if (celeparSets[cn]) return cn
        const alias = CULTURA_ALIASES[cn]
        if (alias && celeparSets[alias]) return alias
        const prefixKey = Object.keys(celeparSets).find(k => k.startsWith(cn + ' ') || cn.startsWith(k + ' '))
        if (prefixKey) return prefixKey
        let bestKey = null, bestScore = 0
        for (const key of Object.keys(celeparSets)) {
          const score = jaccard(cn, key)
          if (score > bestScore) { bestScore = score; bestKey = key }
        }
        return (bestScore >= 0.8 && bestKey) ? bestKey : cn
      }

      const temErro = oracleRows.some(row => {
        const cn   = resolveKey(normSep(row.CULTURA))
        const cSet = celeparSets[cn] ?? new Set()
        return !cSet.has(String(row.SIAGROALV))
      })

      if (temErro) {
        errados.push(nome)
        console.log(`${prefix} → ERRADO`)
      }
    } catch (e) {
      console.log(`${prefix} → ERRO: ${e.message}`)
    }
  }

  await conn.close().catch(() => {})

  const OUTPUT = path.join(__dirname, 'errados_banco_celepar.csv')
  fs.writeFileSync(OUTPUT, ['PRODUTO', ...errados].join('\n'), 'utf8')
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Errados: ${errados.length}`)
  console.log(`Salvo em: ${OUTPUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
