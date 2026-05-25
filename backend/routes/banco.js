const express  = require('express')
const oracledb = require('oracledb')
const fs       = require('fs')
const path     = require('path')
const { fetchPage, parseRows, buildUrl, norm } = require('../lib/scraper')

const TABELAS_JSON = path.join(__dirname, '..', '..', 'banco', 'tabelas.json')

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

router.post('/banco', async (req, res) => {
  if (!oracleReady) {
    return res.status(503).json({ ok: false, error: 'Oracle Instant Client não encontrado em C:\\oracle\\instantclient_21_15' })
  }

  const { sql } = req.body
  if (!sql?.trim()) return res.status(400).json({ ok: false, error: 'sql é obrigatório' })

  let conn
  try {
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })

    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")

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
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })
    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")
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

router.post('/cccb', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { cultura, params = {} } = req.body
  if (!cultura?.trim()) return res.status(400).json({ ok: false, error: 'cultura é obrigatória' })

  let conn
  try {
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })
    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")

    const oracleResult = await conn.execute(
      `SELECT DISTINCT d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO
       FROM RECEITPADRAO r
       JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
       JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
       WHERE UPPER(c.NOME) = UPPER(:cultura)
         AND r.ATIVO = 'Sim'
       ORDER BY d.SIAGROALV`,
      { cultura: cultura.trim() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
    )
    await conn.close()
    conn = null

    const html = await fetchPage(buildUrl(params))
    const cultNorm = norm(cultura.trim())
    const celeparRows = parseRows(html).filter(r => norm(r.cultura) === cultNorm)
    const celeparSet  = new Set(celeparRows.map(r => String(r.siagro)))

    const corretos = oracleResult.rows
      .filter(r => celeparSet.has(String(r.SIAGROALV)))
      .map(r => ({
        cultura:     cultura.trim(),
        alvo_sb:     r.SIAGROALV,
        alvo_siagro: r.SIAGROALV,
        diagnostico: r.DIAGNOSTICO,
      }))

    res.json({
      ok: true,
      oracle:   oracleResult.rows.map(r => ({ siagroalv: r.SIAGROALV, diagnostico: r.DIAGNOSTICO })),
      celepar:  celeparRows.map(r => ({ siagro: r.siagro, alvo: r.alvo })),
      corretos,
      errados:  [],
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

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
