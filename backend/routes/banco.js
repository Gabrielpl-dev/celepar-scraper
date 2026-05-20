const express  = require('express')
const oracledb = require('oracledb')

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

module.exports = router
