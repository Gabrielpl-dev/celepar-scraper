const express  = require('express')
const oracledb = require('oracledb')
const fs       = require('fs')
const path     = require('path')
const { fetchPage, parseRows, buildUrl, norm } = require('../lib/scraper')

const TABELAS_JSON = path.join(__dirname, '..', '..', 'banco', 'tabelas.json')
const CULTURAS_MAP = path.join(__dirname, '..', 'culturas_map.json')

function lerTabelas() {
  try { return JSON.parse(fs.readFileSync(TABELAS_JSON, 'utf8')) }
  catch (_) { return { tabelas: [] } }
}

function gravarTabelas(data) {
  fs.writeFileSync(TABELAS_JSON, JSON.stringify(data, null, 2), 'utf8')
}

function lerCulturasMap() {
  try { return JSON.parse(fs.readFileSync(CULTURAS_MAP, 'utf8')) }
  catch (_) { return [] }
}

function gravarCulturasMap(data) {
  fs.writeFileSync(CULTURAS_MAP, JSON.stringify(data, null, 2), 'utf8')
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

// ── CCCB ─────────────────────────────────────────────────────────────────────

router.get('/cccb/culturas', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  let conn
  try {
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })
    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")
    const result = await conn.execute(
      `SELECT CULTURAID, NOME FROM CULTURA ORDER BY NOME`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
    )
    res.json({ ok: true, culturas: result.rows.map(r => ({ culturaid: r.CULTURAID, nome: r.NOME })) })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

router.post('/cccb/build-mapping', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { params = {} } = req.body
  let conn
  try {
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })
    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")
    const result = await conn.execute(
      `SELECT CULTURAID, NOME FROM CULTURA ORDER BY NOME`,
      [], { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
    )
    await conn.close()
    conn = null

    const html = await fetchPage(buildUrl(params))
    const celeparRows = parseRows(html)

    // norm(cultura) → primeira string original encontrada no Celepar
    const celeparByNorm = {}
    for (const r of celeparRows) {
      const n = norm(r.cultura)
      if (!celeparByNorm[n]) celeparByNorm[n] = r.cultura
    }

    const mapping   = []
    const unmatched = []
    for (const r of result.rows) {
      const celeparNome = celeparByNorm[norm(r.NOME)] ?? null
      mapping.push({ culturaid: r.CULTURAID, oracle_nome: r.NOME, celepar_nome: celeparNome })
      if (!celeparNome) unmatched.push(r.NOME)
    }

    gravarCulturasMap(mapping)
    res.json({ ok: true, total: mapping.length, matched: mapping.length - unmatched.length, unmatched })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

router.post('/cccb', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { culturaid, params = {} } = req.body
  const isAll = culturaid == null

  let conn
  try {
    conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
    })
    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")

    let oracleResult
    if (!isAll) {
      oracleResult = await conn.execute(
        `SELECT DISTINCT c.NOME AS CULTURA, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         WHERE r.CULTURAID = :culturaid
           AND r.ATIVO = 'Sim'
         ORDER BY d.SIAGROALV`,
        { culturaid: Number(culturaid) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    } else {
      oracleResult = await conn.execute(
        `SELECT DISTINCT r.CULTURAID, c.NOME AS CULTURA, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         WHERE r.ATIVO = 'Sim'
         ORDER BY c.NOME, d.SIAGROALV`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    }
    await conn.close()
    conn = null

    const html       = await fetchPage(buildUrl(params))
    const allCelepar = parseRows(html)
    const culturaMap = lerCulturasMap()

    // norm(cultura) → Set<siagro> e norm(cultura) → rows[]
    const celeparSets = {}
    const celeparRows = {}
    for (const r of allCelepar) {
      const n = norm(r.cultura)
      if (!celeparSets[n]) { celeparSets[n] = new Set(); celeparRows[n] = [] }
      celeparSets[n].add(String(r.siagro))
      celeparRows[n].push(r)
    }

    function celeparNormFor(cultura, cid) {
      const mapped = culturaMap.find(m => m.culturaid === cid)
      return mapped?.celepar_nome ? norm(mapped.celepar_nome) : norm(cultura)
    }

    const corretos = []
    if (!isAll) {
      const oracleNome = oracleResult.rows[0]?.CULTURA ?? ''
      const cn = celeparNormFor(oracleNome, Number(culturaid))
      const cSet = celeparSets[cn] ?? new Set()
      for (const r of oracleResult.rows) {
        if (cSet.has(String(r.SIAGROALV)))
          corretos.push({ cultura: r.CULTURA, alvo_sb: r.SIAGROALV, alvo_siagro: r.SIAGROALV, diagnostico: r.DIAGNOSTICO })
      }
    } else {
      for (const r of oracleResult.rows) {
        const cn  = celeparNormFor(r.CULTURA, r.CULTURAID)
        const cSet = celeparSets[cn] ?? new Set()
        if (cSet.has(String(r.SIAGROALV)))
          corretos.push({ cultura: r.CULTURA, alvo_sb: r.SIAGROALV, alvo_siagro: r.SIAGROALV, diagnostico: r.DIAGNOSTICO })
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
      errados: [],
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
