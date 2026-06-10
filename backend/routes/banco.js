const express      = require('express')
const oracledb     = require('oracledb')
const Database     = require('better-sqlite3')
const fs           = require('fs')
const path         = require('path')
const { fetchPage, fetchPesquisa, parseRows, parsePesquisaRows, buildUrl, norm, enrichLinkeaRows } = require('../lib/scraper')
const requireAdmin = require('../middleware/requireAdmin')
const agrofitCsv   = require('../lib/agrofitCsv')
const agrofitApi   = require('../lib/agrofitApi')
const sigenClient  = require('../lib/sigenClient')

const TABELAS_JSON = path.join(__dirname, '..', '..', 'banco', 'tabelas.json')
const DB_PATH      = path.join(__dirname, '..', '..', 'banco', 'local.db')

const db = new Database(DB_PATH)
db.exec(`CREATE TABLE IF NOT EXISTS culturas (
  culturaid   INTEGER PRIMARY KEY,
  nome        TEXT NOT NULL,
  celepar_nome TEXT
)`)

function lerTabelas() {
  try { return JSON.parse(fs.readFileSync(TABELAS_JSON, 'utf8')) }
  catch (_) { return { tabelas: [] } }
}

function gravarTabelas(data) {
  fs.writeFileSync(TABELAS_JSON, JSON.stringify(data, null, 2), 'utf8')
}

const router = express.Router()

let oracleReady = false
try {
  oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_15' })
  oracleReady = true
} catch (_) {
  // Instant Client não instalado — modo Thin não suporta esse servidor Oracle
}

async function oracleConn() {
  const conn = await oracledb.getConnection({
    user:          process.env.ORACLE_USER,
    password:      process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  })
  await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")
  return conn
}

router.post('/banco', requireAdmin, async (req, res) => {
  if (!oracleReady) {
    return res.status(503).json({ ok: false, error: 'Oracle Instant Client não encontrado em C:\\oracle\\instantclient_21_15' })
  }

  const { sql } = req.body
  if (!sql?.trim()) return res.status(400).json({ ok: false, error: 'sql é obrigatório' })

  let conn
  try {
    conn = await oracleConn()
    const cleanSql = sql.trim().replace(/;+$/, '')
    const result = await conn.execute(cleanSql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows:   0,
    })
    res.json({
      ok:   true,
      cols: result.metaData?.map(m => m.name) ?? [],
      rows: result.rows ?? [],
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

router.get('/banco/buscar', requireAdmin, async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { tabela, coluna, q } = req.query
  if (!tabela || !coluna || !q?.trim())
    return res.status(400).json({ ok: false, error: 'tabela, coluna e q são obrigatórios' })
  if (!/^\w+$/.test(tabela) || !/^\w+$/.test(coluna))
    return res.status(400).json({ ok: false, error: 'Nome de tabela/coluna inválido' })

  let conn
  try {
    conn = await oracleConn()
    const result = await conn.execute(
      `SELECT DISTINCT ${coluna} FROM ${tabela} WHERE UPPER(${coluna}) LIKE UPPER(:q) ORDER BY ${coluna} FETCH FIRST 50 ROWS ONLY`,
      { q: q.trim() + '%' },
      { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
    )
    res.json({ ok: true, rows: result.rows.map(r => r[coluna.toUpperCase()]) })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

// ── Busca unificada (Celepar + Agrofit CSV + API) ────────────────────────────

router.get('/buscar-produto', async (req, res) => {
  const { nome } = req.query
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })

  const [celeparRows, csvRows, apiRows] = await Promise.all([
    fetchPesquisa()
      .then(html => parsePesquisaRows(html).filter(r => norm(r.nome).includes(norm(nome.trim()))).slice(0, 10))
      .catch(() => []),
    agrofitCsv.buscarPorNome(nome.trim()),
    agrofitApi.buscarPorNome(nome.trim()),
  ])

  // Mapa por nome normalizado para mesclar entradas de fontes diferentes
  const byNome = new Map()

  for (const r of celeparRows) {
    const key = norm(r.nome)
    byNome.set(key, { nome: r.nome, cod: r.cod, ma: null, ingrediente: null, fonte: 'adapar' })
  }

  const agrofitSeen = new Set()
  for (const r of [...csvRows, ...apiRows]) {
    const maKey = r.ma || r.nome
    if (agrofitSeen.has(maKey)) continue
    agrofitSeen.add(maKey)

    const key = norm(r.nome)
    if (byNome.has(key)) {
      // Mescla: mesmo produto nas duas fontes
      const existing = byNome.get(key)
      existing.ma         = r.ma || null
      existing.ingrediente = r.ingrediente || null
      existing.fonte      = 'ambos'
    } else {
      byNome.set(key, { nome: r.nome, cod: null, ma: r.ma || null, ingrediente: r.ingrediente || null, fonte: 'agrofit' })
    }
  }

  res.json({ ok: true, rows: [...byNome.values()].slice(0, 25) })
})

// ── Verificar produto nas fontes ──────────────────────────────────────────────

router.get('/verificar-produto', async (req, res) => {
  const { nome, cod, ma: maParam } = req.query
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })

  const [banco, adapar, agrofitRows] = await Promise.all([
    // Oracle
    (async () => {
      if (!oracleReady) return false
      let conn
      try {
        conn = await oracleConn()
        const r = await conn.execute(
          `SELECT COUNT(*) AS QTD FROM RECEITPADRAO WHERE DESCRICAO = :nome`,
          { nome: nome.trim() },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
        )
        return (r.rows[0]?.QTD ?? 0) > 0
      } catch (_) { return false }
      finally { if (conn) await conn.close().catch(() => {}) }
    })(),

    // Adapar/Celepar por cod
    (async () => {
      if (!cod?.trim()) return false
      try {
        const html = await fetchPage(buildUrl({ Cod: cod.trim() }))
        return parseRows(html).length > 0
      } catch (_) { return false }
    })(),

    // Agrofit: CSV + API em paralelo, deduplica por MA
    (async () => {
      const [csv, api] = await Promise.all([
        agrofitCsv.buscarPorNome(nome.trim()),
        agrofitApi.buscarPorNome(nome.trim()),
      ])
      const seen = new Map()
      for (const r of [...csv, ...api]) {
        const key = r.ma || r.nome
        if (!seen.has(key)) seen.set(key, r)
      }
      return [...seen.values()]
    })(),
  ])

  const agrofitEncontrado = agrofitRows.length > 0
  const ma = maParam?.trim() || (agrofitEncontrado ? agrofitRows[0].ma : null)

  // Sigen: só se temos um MA numérico
  let sigen = null
  if (ma && /^\d+$/.test(ma)) {
    try {
      const r = await sigenClient.verificarMA(ma)
      sigen = r.encontrado
    } catch (_) {
      sigen = false
    }
  }

  res.json({
    ok:    true,
    banco,
    adapar,
    agrofit: agrofitEncontrado,
    agrofitInfo: agrofitEncontrado
      ? { ma: agrofitRows[0].ma, nome: agrofitRows[0].nome, ingrediente: agrofitRows[0].ingrediente }
      : null,
    sigen,
  })
})

// ── Culturas local ────────────────────────────────────────────────────────────

router.post('/culturas/sincronizar', requireAdmin, async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  let conn
  try {
    conn = await oracleConn()
    const result = await conn.execute(
      `SELECT CULTURAID, NOME FROM CULTURA ORDER BY NOME`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
    )
    await conn.close(); conn = null

    const upsert = db.prepare(`
      INSERT INTO culturas (culturaid, nome)
      VALUES (?, ?)
      ON CONFLICT(culturaid) DO UPDATE SET nome = excluded.nome
    `)
    db.transaction(rows => { for (const r of rows) upsert.run(r.CULTURAID, r.NOME) })(result.rows)

    res.json({ ok: true, total: result.rows.length })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

// ── CCCB ─────────────────────────────────────────────────────────────────────

router.get('/cccb/culturas', (req, res) => {
  try {
    const culturas = db.prepare('SELECT culturaid, nome FROM culturas ORDER BY nome').all()
    res.json({ ok: true, culturas })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/cccb/build-mapping', requireAdmin, async (req, res) => {
  const { params = {} } = req.body
  try {
    const html = await fetchPage(buildUrl(params))
    const celeparRows = parseRows(html)

    const celeparByNorm = {}
    for (const r of celeparRows) {
      const n = norm(r.cultura)
      if (!celeparByNorm[n]) celeparByNorm[n] = r.cultura
    }

    const todas = db.prepare('SELECT culturaid, nome FROM culturas').all()
    if (todas.length === 0)
      return res.status(400).json({ ok: false, error: 'Tabela local vazia — sincronize as culturas primeiro' })

    const update    = db.prepare('UPDATE culturas SET celepar_nome = ? WHERE culturaid = ?')
    const unmatched = []
    db.transaction(rows => {
      for (const r of rows) {
        const celeparNome = celeparByNorm[norm(r.nome)] ?? null
        update.run(celeparNome, r.culturaid)
        if (!celeparNome) unmatched.push(r.nome)
      }
    })(todas)

    res.json({ ok: true, total: todas.length, matched: todas.length - unmatched.length, unmatched })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/cccb', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { culturaid, params = {}, enrichLinkea = false } = req.body
  const isAll  = culturaid == null
  const produto = params.nome ?? null
  if (!produto) return res.status(400).json({ ok: false, error: 'params.nome (produto) é obrigatório' })

  function celeparNormFor(cultura, cid) {
    const row = db.prepare('SELECT celepar_nome FROM culturas WHERE culturaid = ?').get(cid)
    return row?.celepar_nome ? norm(row.celepar_nome) : norm(cultura)
  }

  let conn
  try {
    conn = await oracleConn()

    let oracleResult
    if (!isAll) {
      oracleResult = await conn.execute(
        `SELECT DISTINCT c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO, d.NOMECIENTIFICO
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         WHERE r.DESCRICAO = :produto
           AND r.CULTURAID = :culturaid
           AND r.ATIVO = 'S'
         ORDER BY d.SIAGROALV`,
        { produto, culturaid: Number(culturaid) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    } else {
      oracleResult = await conn.execute(
        `SELECT DISTINCT r.CULTURAID, c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO, d.NOMECIENTIFICO
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         WHERE r.DESCRICAO = :produto
           AND r.ATIVO = 'S'
         ORDER BY c.NOME, d.SIAGROALV`,
        { produto },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    }
    await conn.close(); conn = null

    const html           = await fetchPage(buildUrl(params))
    let   allCelepar     = parseRows(html)
    if (enrichLinkea) allCelepar = await enrichLinkeaRows(allCelepar)

    const celeparSets = {}
    const celeparRows = {}
    for (const r of allCelepar) {
      const n = norm(r.cultura)
      if (!celeparSets[n]) { celeparSets[n] = new Set(); celeparRows[n] = [] }
      celeparSets[n].add(String(r.siagro))
      celeparRows[n].push(r)
    }

    // Jaccard sobre conjunto de palavras: cobre pontuação diferente e reordenação
    const tokenize = s => new Set(s.replace(/[^a-z0-9 ]/g, '').replace(/ +/g, ' ').trim().split(' ').filter(Boolean))
    const jaccard = (a, b) => {
      const sa = tokenize(a), sb = tokenize(b)
      const inter = [...sa].filter(w => sb.has(w)).length
      return inter / new Set([...sa, ...sb]).size
    }
    const resolveKey = cn => {
      if (celeparSets[cn]) return cn
      let bestKey = null, bestScore = 0
      for (const key of Object.keys(celeparSets)) {
        const score = jaccard(cn, key)
        if (score > bestScore) { bestScore = score; bestKey = key }
      }
      return (bestScore >= 0.8 && bestKey) ? bestKey : cn
    }

    const corretos = []
    const errados  = []
    if (!isAll) {
      const oracleNome = oracleResult.rows[0]?.CULTURA ?? ''
      const cn   = resolveKey(celeparNormFor(oracleNome, Number(culturaid)))
      const cSet = celeparSets[cn] ?? new Set()
      const cRows = celeparRows[cn] ?? []
      for (const r of oracleResult.rows) {
        const item = { cultura: r.CULTURA, alvo_sb: r.SIAGROALV, diagnosticoid: r.DIAGNOSTICOID, diagnostico: r.DIAGNOSTICO, nomecientifico: r.NOMECIENTIFICO }
        if (cSet.has(String(r.SIAGROALV))) {
          const celRow = cRows.find(cr => String(cr.siagro) === String(r.SIAGROALV))
          corretos.push({ ...item, alvo_siagro: r.SIAGROALV, nomeComumAlvo: celRow?.nomeComumAlvo ?? null })
        } else {
          errados.push(item)
        }
      }
    } else {
      for (const r of oracleResult.rows) {
        const cn   = resolveKey(celeparNormFor(r.CULTURA, r.CULTURAID))
        const cSet = celeparSets[cn] ?? new Set()
        const cRows = celeparRows[cn] ?? []
        const item = { cultura: r.CULTURA, alvo_sb: r.SIAGROALV, diagnosticoid: r.DIAGNOSTICOID, diagnostico: r.DIAGNOSTICO, nomecientifico: r.NOMECIENTIFICO }
        if (cSet.has(String(r.SIAGROALV))) {
          const celRow = cRows.find(cr => String(cr.siagro) === String(r.SIAGROALV))
          corretos.push({ ...item, alvo_siagro: r.SIAGROALV, nomeComumAlvo: celRow?.nomeComumAlvo ?? null })
        } else {
          errados.push(item)
        }
      }
    }

    const oracleByKey = {}
    for (const r of oracleResult.rows) {
      const cn = isAll
        ? resolveKey(celeparNormFor(r.CULTURA, r.CULTURAID))
        : resolveKey(celeparNormFor(r.CULTURA, Number(culturaid)))
      if (!oracleByKey[cn]) oracleByKey[cn] = new Set()
      oracleByKey[cn].add(String(r.SIAGROALV))
    }

    const celeparToCheck = isAll
      ? allCelepar
      : (celeparRows[resolveKey(celeparNormFor(oracleResult.rows[0]?.CULTURA ?? '', Number(culturaid)))] ?? [])

    const faltando = []
    for (const r of celeparToCheck) {
      const oSet = oracleByKey[norm(r.cultura)] ?? new Set()
      if (!oSet.has(String(r.siagro)))
        faltando.push({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null })
    }

    const celeparForResponse = isAll
      ? allCelepar.map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null, _linkeaUrl: r.linkeaUrl ?? null }))
      : (celeparRows[resolveKey(celeparNormFor(oracleResult.rows[0]?.CULTURA ?? '', Number(culturaid)))] ?? [])
          .map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null, _linkeaUrl: r.linkeaUrl ?? null }))

    res.json({
      ok:      true,
      oracle:  oracleResult.rows.map(r => ({ cultura: r.CULTURA, siagroalv: r.SIAGROALV, diagnostico: r.DIAGNOSTICO, nomecientifico: r.NOMECIENTIFICO })),
      celepar: celeparForResponse,
      corretos,
      errados,
      faltando,
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

// ── Tabelas conhecidas ────────────────────────────────────────────────────────

router.post('/banco/tabelas/salvar', requireAdmin, (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })
  const data = lerTabelas()
  if (!data.tabelas.includes(nome)) {
    data.tabelas.push(nome)
    data.tabelas.sort()
    gravarTabelas(data)
  }
  res.json({ ok: true, tabelas: data.tabelas })
})

router.post('/banco/tabelas/excluir', requireAdmin, (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })
  const data = lerTabelas()
  data.tabelas = data.tabelas.filter(t => t !== nome)
  gravarTabelas(data)
  res.json({ ok: true, tabelas: data.tabelas })
})

module.exports = router
