// node ouro_safra_comparar.js
// Saída: errados_banco_celepar.csv no mesmo diretório.

const fs       = require('fs')
const path     = require('path')
const backendMod  = path.join(__dirname, 'backend', 'node_modules')
const oracledb    = require(path.join(backendMod, 'oracledb'))
const { fetchPesquisa, fetchPage, parseRows, parsePesquisaRows, buildUrl } = require('./backend/lib/scraper')
const { norm, normSep, tokenize } = require('./backend/lib/normalizer')
const agrofitCsv  = require('./backend/lib/agrofitCsv')
const agrofitApi  = require('./backend/lib/agrofitApi')

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

function lenRatio(a, b) {
  return Math.min(a.length, b.length) / Math.max(a.length, b.length)
}

// Mesma estratégia da rota /api/cccb (routes/banco.js): a MA é a chave de
// verdade — resolvida via Agrofit (busca exata por marca_comercial), nunca
// por fuzzy-match do nome contra RECEITPADRAO.DESCRICAO. Ligar direto pela MA
// evita os falsos "não cadastrado" que o fuzzy-match de texto produzia.
async function resolveMa(nome) {
  const [csvRows, apiRows] = await Promise.all([
    agrofitCsv.buscarPorNome(nome).catch(() => []),
    agrofitApi.buscarPorNome(nome).catch(() => []),
  ])
  const byMa = new Map()
  for (const r of [...csvRows, ...apiRows]) {
    const ma = r.ma?.trim()
    if (ma && !byMa.has(ma)) byMa.set(ma, r.nome)
  }
  if (!byMa.size) return null

  const n = norm(nome)
  for (const [ma, rNome] of byMa) if (norm(rNome) === n) return ma
  for (const [ma, rNome] of byMa) {
    const rn = norm(rNome)
    if (rn.startsWith(n) || n.startsWith(rn)) return ma
  }
  return byMa.keys().next().value
}

async function getOracleRegistros(conn, ma) {
  const r = await conn.execute(
    `SELECT DISTINCT d.SIAGROALV, c.NOME AS CULTURA
     FROM RECEITPADRAO r
     JOIN CULTURA     c ON r.CULTURAID     = c.CULTURAID
     JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
     JOIN AGROTOXICO  a ON a.RECPADRAOID   = r.RECPADRAOID
     WHERE a.REGISTROMA = :ma AND r.ATIVO = 'S'`,
    { ma },
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
  'OLEO MIN ASSIST','ARMERO BR','GLI-UP 720 WG','VIANCE',
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
  // Ordena do nome mais longo pro mais curto para preferir matches mais específicos
  const nomesCelepar = [...todosNomes].sort((a, b) => norm(b.nome).length - norm(a.nome).length)
  console.log(`${todosNomes.length} produtos no CELEPAR.\n`)

  let conn
  try {
    conn = await oracleConn()
    console.log('Conectado ao Oracle.\n')
  } catch (e) {
    console.error('Falha ao conectar Oracle:', e.message)
    process.exit(1)
  }

  const errados = []

  for (let i = 0; i < PRODUTOS.length; i++) {
    const nome   = PRODUTOS[i]
    const prefix = `[${String(i + 1).padStart(3)}/${PRODUTOS.length}] ${nome}`

    try {
      const ma = await resolveMa(nome)
      if (!ma) {
        console.log(`${prefix} → não cadastrado (sem MA na Agrofit)`)
        continue
      }

      const oracleRows = await getOracleRegistros(conn, ma)
      if (!oracleRows.length) {
        console.log(`${prefix} → não cadastrado`)
        continue
      }

      const n     = norm(nome)
      const match = nomesCelepar.find(r => {
        const rn = norm(r.nome)
        if (!r.cod || rn.length < 4) return false
        if (rn === n) return true
        if (rn.includes(n) && lenRatio(rn, n) >= 0.7) return true
        // n contém rn: exige boundary de palavra — evita "melyra" casar com "lyra"
        return n.startsWith(rn + ' ') || n.endsWith(' ' + rn) || n.includes(' ' + rn + ' ')
      })
      if (!match) { console.log(`${prefix} → não encontrado no CELEPAR`); continue }

      const celeparHtml = await fetchPage(buildUrl({ Cod: match.cod }))
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

      const falhas = oracleRows.filter(row => {
        const cn   = resolveKey(normSep(row.CULTURA))
        const cSet = celeparSets[cn] ?? new Set()
        return !cSet.has(String(row.SIAGROALV))
      })

      if (falhas.length) {
        errados.push(nome)
        console.log(`${prefix} → ERRADO (oracle MA: ${ma} | celepar: "${match.nome}" | ${falhas.length} sem match)`)
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
