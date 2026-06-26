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
const agrofitDb    = require('../db')

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

// Normaliza separadores / ; | para espaço — cobre divergências de formato entre banco e Celepar
const normSep = s => norm(s).replace(/[/;|]+/g, ' ').replace(/\s+/g, ' ').trim()

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
    console.error('[banco/sql]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
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
    console.error('[banco/route]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

// ── Busca unificada (Celepar + Agrofit CSV + API) ────────────────────────────

router.get('/buscar-produto', async (req, res) => {
  const { nome } = req.query
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })

  const [csvRows, apiRows, pesquisaHtml] = await Promise.all([
    agrofitCsv.buscarPorNome(nome.trim()),
    agrofitApi.buscarPorNome(nome.trim()),
    fetchPesquisa().catch(() => null),
  ])

  // Celepar: filtra pesquisa pelo nome buscado
  const celeparRows = pesquisaHtml
    ? parsePesquisaRows(pesquisaHtml).filter(r => normSep(r.nome).includes(normSep(nome.trim()))).slice(0, 10)
    : []

  // Agrofit: deduplica por MA (fonte de verdade para nome)
  const byMa = new Map()
  for (const r of [...csvRows, ...apiRows]) {
    const parsed = r.ma?.trim() ? parseInt(r.ma, 10) : NaN
    const normMa = r.ma?.trim() ? (isNaN(parsed) ? r.ma.trim() : String(parsed)) : null
    const key    = normMa || r.nome
    if (!byMa.has(key))
      byMa.set(key, { nome: r.nome, ma: normMa, cod: null, ingrediente: r.ingrediente || null, fonte: 'agrofit' })
  }

  // Merge Celepar->Agrofit por prefixo de nome (cobre truncacao: "OpteraPr" casa com "OpteraPro")
  const celeparOrphans = []
  for (const cel of celeparRows) {
    const nc = normSep(cel.nome)
    let matched = false
    for (const agr of byMa.values()) {
      const na = normSep(agr.nome)
      if (na === nc || na.startsWith(nc) || nc.startsWith(na)) {
        agr.cod   = cel.cod
        agr.fonte = 'ambos'
        matched = true
        break
      }
    }
    if (!matched)
      celeparOrphans.push({ nome: cel.nome, ma: null, cod: cel.cod, ingrediente: null, fonte: 'adapar' })
  }

  const rows = [...byMa.values(), ...celeparOrphans].slice(0, 25)

  const upsertRegistry = agrofitDb.prepare(`
    INSERT INTO produto_registry (ma, nome, cod, ingrediente)
    VALUES (@ma, @nome, @cod, @ingrediente)
    ON CONFLICT(ma) DO UPDATE SET
      nome        = excluded.nome,
      cod         = COALESCE(excluded.cod, produto_registry.cod),
      ingrediente = COALESCE(excluded.ingrediente, produto_registry.ingrediente),
      updated_at  = datetime('now','localtime')
  `)
  agrofitDb.transaction(rs => { for (const r of rs) if (r.ma) upsertRegistry.run(r) })(rows)

  res.json({ ok: true, rows })
})

// ── Verificar produto nas fontes ──────────────────────────────────────────────

router.get('/verificar-produto', async (req, res) => {
  const { nome, ma: maParam, cod: codParam } = req.query
  if (!nome?.trim()) return res.status(400).json({ ok: false, error: 'nome é obrigatório' })

  const ma  = maParam?.trim()  || null
  const cod = codParam?.trim() || null

  const [banco, adapar, agrofitRows] = await Promise.all([
    // Oracle — por MA se disponível, senão por nome
    (async () => {
      if (!oracleReady) return false
      let conn
      try {
        conn = await oracleConn()
        if (ma) {
          const r = await conn.execute(
            `SELECT COUNT(*) AS QTD FROM RECEITPADRAO r JOIN AGROTOXICO a ON r.DESCRICAO = a.NOME WHERE a.REGISTROMA = :ma`,
            { ma },
            { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
          )
          return (r.rows[0]?.QTD ?? 0) > 0
        }
        const r = await conn.execute(
          `SELECT COUNT(*) AS QTD FROM RECEITPADRAO WHERE DESCRICAO = :nome`,
          { nome: nome.trim() },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
        )
        return (r.rows[0]?.QTD ?? 0) > 0
      } catch (_) { return false }
      finally { if (conn) await conn.close().catch(() => {}) }
    })(),

    // Adapar/Celepar por Cod (direto via param; fallback lookup em agrofit_ids)
    (async () => {
      try {
        let celCod = cod
        if (!celCod && ma) {
          const stored = agrofitDb.prepare('SELECT cod FROM agrofit_ids WHERE ma = ?').get(ma)
          celCod = stored?.cod || null
        }
        if (!celCod) return false
        const html = await fetchPage(buildUrl({ Cod: celCod }))
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
  const resolvedMa = ma || (agrofitEncontrado ? agrofitRows[0].ma : null)

  let sigen = null
  if (resolvedMa && /^\d+$/.test(resolvedMa)) {
    try {
      const r = await sigenClient.verificarMA(resolvedMa)
      sigen = r.encontrado
    } catch (_) { sigen = false }
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
    console.error('[banco/route]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
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
    console.error('[banco/cccb]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
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
    console.error('[banco/cccb]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

router.post('/cccb', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { culturaid, params = {}, enrichLinkea = false } = req.body
  const isAll = culturaid == null
  const ma    = params.ma ?? null
  if (!ma) return res.status(400).json({ ok: false, error: 'params.ma (registro MA) é obrigatório' })

  // Nomes do banco que diferem do nome na Celepar — substitui antes de qualquer comparação
  const BANCO_PARA_CELEPAR = { 'PINUS': 'pinus sp', 'PASTAGEM': 'pastagens' }

  function celeparNormFor(cultura, cid) {
    const sub = BANCO_PARA_CELEPAR[String(cultura).toUpperCase().trim()]
    if (sub) return sub
    const row = db.prepare('SELECT celepar_nome FROM culturas WHERE culturaid = ?').get(cid)
    if (row?.celepar_nome) return norm(row.celepar_nome)
    return norm(cultura)
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
         JOIN AGROTOXICO a ON r.DESCRICAO = a.NOME
         WHERE a.REGISTROMA = :ma
           AND r.CULTURAID = :culturaid
           AND r.ATIVO = 'S'
         ORDER BY d.SIAGROALV`,
        { ma, culturaid: Number(culturaid) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    } else {
      oracleResult = await conn.execute(
        `SELECT DISTINCT r.CULTURAID, c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO, d.NOMECIENTIFICO
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         JOIN AGROTOXICO a ON r.DESCRICAO = a.NOME
         WHERE a.REGISTROMA = :ma
           AND r.ATIVO = 'S'
         ORDER BY c.NOME, d.SIAGROALV`,
        { ma },
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
    const tokenize = s => { const n = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return new Set(n.replace(/[^a-z0-9 ]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(Boolean)) }
    const jaccard = (a, b) => {
      const sa = tokenize(a), sb = tokenize(b)
      const inter = [...sa].filter(w => sb.has(w)).length
      return inter / new Set([...sa, ...sb]).size
    }
    // Culturas onde banco e Celepar usam nomes ligeiramente diferentes
    const CULTURA_ALIASES = { 'pastagem': 'pastagens', 'pinus': 'pinus sp' }
    const resolveKey = cn => {
      if (celeparSets[cn]) return cn
      const alias = CULTURA_ALIASES[cn]
      if (alias && celeparSets[alias]) return alias
      // Prefix match: banco pode ter nome mais curto (ex: PINUS vs PINUS SP)
      const prefixKey = Object.keys(celeparSets).find(k => k.startsWith(cn + ' ') || cn.startsWith(k + ' '))
      if (prefixKey) return prefixKey
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
      ? allCelepar.map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null }))
      : (celeparRows[resolveKey(celeparNormFor(oracleResult.rows[0]?.CULTURA ?? '', Number(culturaid)))] ?? [])
          .map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null }))

    const seenDebug = new Set()
    const _debug = {
      celeparKeys: Object.keys(celeparSets),
      oracleResolved: oracleResult.rows
        .filter(r => { if (seenDebug.has(r.CULTURA)) return false; seenDebug.add(r.CULTURA); return true })
        .map(r => {
          const cid = isAll ? r.CULTURAID : Number(culturaid)
          const raw = celeparNormFor(r.CULTURA, cid)
          return { cultura: r.CULTURA, culturaid: cid, normFor: raw, resolved: resolveKey(raw), inCelepar: !!celeparSets[resolveKey(raw)] }
        }),
    }

    res.json({
      ok:      true,
      oracle:  oracleResult.rows.map(r => ({ cultura: r.CULTURA, siagroalv: r.SIAGROALV, diagnostico: r.DIAGNOSTICO, nomecientifico: r.NOMECIENTIFICO })),
      celepar: celeparForResponse,
      corretos,
      errados,
      faltando,
      _debug,
    })
  } catch (err) {
    console.error('[banco/cccb]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  } finally {
    if (conn) await conn.close().catch(() => {})
  }
})

// ── SSE: watch Oracle para mudanças no produto ───────────────────────────────

router.get('/cccb/watch', async (req, res) => {
  if (!oracleReady) return res.status(503).end()
  const { ma } = req.query
  if (!ma || !/^\d+$/.test(ma)) return res.status(400).end()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  let lastCount = null

  async function check() {
    if (res.writableEnded) return
    let conn
    try {
      conn = await oracleConn()
      const r = await conn.execute(
        `SELECT COUNT(*) AS QTD FROM RECEITPADRAO r
         JOIN AGROTOXICO a ON r.DESCRICAO = a.NOME
         WHERE a.REGISTROMA = :ma AND r.ATIVO = 'S'`,
        { ma },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
      const count = Number(r.rows[0]?.QTD ?? 0)
      if (lastCount !== null && count !== lastCount)
        res.write(`event: changed\ndata: ${JSON.stringify({ count })}\n\n`)
      lastCount = count
    } catch (_) {} finally {
      if (conn) await conn.close().catch(() => {})
    }
  }

  await check()
  const poll = setInterval(check, 15_000)
  const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n') }, 30_000)

  req.on('close', () => { clearInterval(poll); clearInterval(ping) })
})

// ── Diagnóstico por SIAGROALV ─────────────────────────────────────────────────

router.get('/banco/diagnostico', async (req, res) => {
  if (!oracleReady) return res.status(503).json({ ok: false, error: 'Oracle não disponível' })
  const { siagroalv } = req.query
  if (!siagroalv?.trim()) return res.status(400).json({ ok: false, error: 'siagroalv é obrigatório' })
  let conn
  try {
    conn = await oracleConn()
    const result = await conn.execute(
      `SELECT DIAGNOSTICOID, SIAGROALV, DESCRICAO, NOMECIENTIFICO FROM DIAGNOSTICO WHERE SIAGROALV = :siagroalv ORDER BY DESCRICAO`,
      { siagroalv: siagroalv.trim() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
    )
    res.json({ ok: true, rows: result.rows })
  } catch (err) {
    console.error('[banco/diagnostico]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
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
