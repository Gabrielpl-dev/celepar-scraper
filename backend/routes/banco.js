const express  = require('express')
const oracledb = require('oracledb')
const Database = require('better-sqlite3')
const fs       = require('fs')
const path     = require('path')
const { fetchPage, parseRows, buildUrl, norm } = require('../lib/scraper')

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

router.post('/banco', async (req, res) => {
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

router.get('/banco/buscar', async (req, res) => {
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

// ── Verificar produto nas fontes ──────────────────────────────────────────────

router.get('/verificar-produto', async (req, res) => {
  const { nome } = req.query
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })

  let banco = false
  if (oracleReady) {
    let conn
    try {
      conn = await oracleConn()
      const r = await conn.execute(
        `SELECT COUNT(*) AS QTD FROM RECEITPADRAO WHERE DESCRICAO = :nome`,
        { nome: nome.trim() },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
      banco = (r.rows[0]?.QTD ?? 0) > 0
    } catch (_) {
      banco = false
    } finally {
      if (conn) await conn.close().catch(() => {})
    }
  }

  res.json({ ok: true, banco, adapar: null, agrofit: null, sigen: null })
})

// ── Culturas local ────────────────────────────────────────────────────────────

router.post('/culturas/sincronizar', async (req, res) => {
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

router.post('/cccb/build-mapping', async (req, res) => {
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
  const { culturaid, params = {} } = req.body
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
        `SELECT DISTINCT c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO
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
        `SELECT DISTINCT r.CULTURAID, c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO
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

    const html       = await fetchPage(buildUrl(params))
    const allCelepar = parseRows(html)

    const celeparSets = {}
    const celeparRows = {}
    for (const r of allCelepar) {
      const n = norm(r.cultura)
      if (!celeparSets[n]) { celeparSets[n] = new Set(); celeparRows[n] = [] }
      celeparSets[n].add(String(r.siagro))
      celeparRows[n].push(r)
    }

    const corretos = []
    const errados  = []
    if (!isAll) {
      const oracleNome = oracleResult.rows[0]?.CULTURA ?? ''
      const cn   = celeparNormFor(oracleNome, Number(culturaid))
      const cSet = celeparSets[cn] ?? new Set()
      for (const r of oracleResult.rows) {
        const item = { cultura: r.CULTURA, alvo_sb: r.SIAGROALV, diagnosticoid: r.DIAGNOSTICOID, diagnostico: r.DIAGNOSTICO }
        if (cSet.has(String(r.SIAGROALV)))
          corretos.push({ ...item, alvo_siagro: r.SIAGROALV })
        else
          errados.push(item)
      }
    } else {
      for (const r of oracleResult.rows) {
        const cn   = celeparNormFor(r.CULTURA, r.CULTURAID)
        const cSet = celeparSets[cn] ?? new Set()
        const item = { cultura: r.CULTURA, alvo_sb: r.SIAGROALV, diagnosticoid: r.DIAGNOSTICOID, diagnostico: r.DIAGNOSTICO }
        if (cSet.has(String(r.SIAGROALV)))
          corretos.push({ ...item, alvo_siagro: r.SIAGROALV })
        else
          errados.push(item)
      }
    }

    const celeparForResponse = isAll
      ? allCelepar.map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo }))
      : (celeparRows[celeparNormFor(oracleResult.rows[0]?.CULTURA ?? '', Number(culturaid))] ?? [])
          .map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo }))

    res.json({
      ok:      true,
      oracle:  oracleResult.rows.map(r => ({ cultura: r.CULTURA, siagroalv: r.SIAGROALV, diagnostico: r.DIAGNOSTICO })),
      celepar: celeparForResponse,
      corretos,
      errados,
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

// ── Tabelas conhecidas ────────────────────────────────────────────────────────

router.post('/banco/tabelas/salvar', (req, res) => {
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

router.post('/banco/tabelas/excluir', (req, res) => {
  const { nome } = req.body
  if (!nome) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })
  const data = lerTabelas()
  data.tabelas = data.tabelas.filter(t => t !== nome)
  gravarTabelas(data)
  res.json({ ok: true, tabelas: data.tabelas })
})

module.exports = router
