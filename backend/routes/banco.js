const express      = require('express')
const oracledb     = require('oracledb')
const Database     = require('better-sqlite3')
const fs           = require('fs')
const { fetchPage, fetchPesquisa, parseRows, parsePesquisaRows, buildUrl, enrichLinkeaRows } = require('../lib/scraper')
const { norm, normSep, tokenize } = require('../lib/normalizer')
const { ORACLE_LIB_DIR, TABELAS_JSON, CULTURAS_DB } = require('../lib/config')
const requireAdmin = require('../middleware/requireAdmin')
const agrofitCsv   = require('../lib/agrofitCsv')
const agrofitApi   = require('../lib/agrofitApi')
const sigenClient  = require('../lib/sigenClient')
const agrofitDb    = require('../db')

const db = new Database(CULTURAS_DB)
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
  oracledb.initOracleClient({ libDir: ORACLE_LIB_DIR })
  oracleReady = true
} catch (_) {
  // Instant Client não instalado — modo Thin não suporta esse servidor Oracle
}

const ORACLE_CONNECT_TIMEOUT_S = 5

// Injeta CONNECT_TIMEOUT no nível DESCRIPTION do descriptor TNS — em modo thick
// (initOracleClient acima) a opção connectTimeout do node-oracledb é ignorada
// pelo binding nativo, só existe na implementação thin (que esse servidor Oracle
// não suporta). Sem isso, uma falha de rede até o jump host (ORA-12170, ver
// .envs/infra.md) trava por um tempo indefinido em vez de falhar rápido.
function withConnectTimeout(connectString, seconds) {
  if (!connectString || /connect_timeout/i.test(connectString)) return connectString
  return connectString.replace(/\(\s*description\s*=/i, `(description=(connect_timeout=${seconds})`)
}

// Não tenta de novo dentro da mesma request: os ORA-12170 observados vêm em
// rajada (rota até o Oracle fora do ar por segundos/minutos, não um blip de
// milissegundos) — retry aqui só somaria espera sem chance real de sucesso.
// Falha rápido com o erro real.
async function oracleConn() {
  try {
    const conn = await oracledb.getConnection({
      user:          process.env.ORACLE_USER,
      password:      process.env.ORACLE_PASSWORD,
      connectString: withConnectTimeout(process.env.ORACLE_CONNECT_STRING, ORACLE_CONNECT_TIMEOUT_S),
    })
    await conn.execute("ALTER SESSION SET CURRENT_SCHEMA = VIASOFT")
    return conn
  } catch (err) {
    if (err.errorNum === 12170) onOraConnectFailure()
    throw err
  }
}

// Confirmado por teste manual (12/08): esperar a rede se recompor sozinha não
// resolve o ORA-12170, mas reiniciar o processo resolve na hora — indica algo
// preso dentro do processo (ex.: cache de resolução de nome do cliente Oracle),
// não instabilidade pura de rede. Em vez de perseguir a causa exata dentro do
// binding nativo do OCI, automatiza a própria rotina manual que já comprovou
// funcionar: na primeira falha, o processo já se derruba de propósito e deixa
// o PM2 (max_restarts/exp_backoff já configurados no ecosystem.config.cjs)
// recriar — sem precisar de ninguém rodando taskkill às 7h da manhã.
let restartingForOraFailure = false

function onOraConnectFailure() {
  if (restartingForOraFailure) return
  restartingForOraFailure = true
  console.error('[banco/oracleConn] ORA-12170 — reiniciando o processo (PM2 recria automaticamente)')
  process.kill(process.pid, 'SIGTERM')
}

// Erro de conexão Oracle (ORA-xxxxx) é seguro de expor — não vaza schema/dados,
// só diz que o banco está inacessível. Erros sem errorNum (bug de app) continuam
// genéricos pra não vazar detalhe interno.
function oracleErrorResponse(res, err, contexto) {
  console.error(`[banco/${contexto}]`, err)
  if (err.errorNum) {
    return res.status(503).json({ ok: false, error: `Oracle indisponível: ${err.message}`, code: `ORA-${err.errorNum}` })
  }
  return res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
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
    oracleErrorResponse(res, err, 'sql')
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
    oracleErrorResponse(res, err, 'route')
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

  // Merge Celepar->Agrofit por prefixo de nome (cobre truncacao mid-word: "OpteraPr" casa com "OpteraPro")
  // Requer que o prefixo não termine em espaço — evita casar variantes distintas ("Dorai" vs "Dorai Max")
  const isTruncMatch = (shorter, longer) => longer.startsWith(shorter) && !longer.slice(shorter.length).startsWith(' ')
  // Um único MA na Agrofit pode agrupar várias marcas comerciais (ex: "Clopanto; Nanofos;
  // Teminator;"), enquanto a Celepar cadastra cada marca como produto separado. Comparar
  // contra a string toda faria "clopanto" virar "clopanto nanofos teminator" (';' -> ' '
  // no normSep) e cair na guarda anti-falso-positivo acima. Por isso casa contra cada
  // marca individualmente.
  const splitAliases = nome => nome.split(/[/;|]+/).map(normSep).filter(Boolean)
  const celeparOrphans = []
  for (const cel of celeparRows) {
    const nc = normSep(cel.nome)
    let matched = false
    for (const agr of byMa.values()) {
      const aliases = splitAliases(agr.nome)
      if (aliases.some(na => na === nc || isTruncMatch(nc, na) || isTruncMatch(na, nc))) {
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
            `SELECT COUNT(*) AS QTD FROM RECEITPADRAO r JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID WHERE a.REGISTROMA = :ma`,
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
    oracleErrorResponse(res, err, 'route')
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
  const BANCO_PARA_CELEPAR = {
    'PASTAGEM': 'pastagens',
    'MILHO O.G.M': 'milho geneticamente modificado',
    'SOJA - O.G.M [TOLERANTE AO GLIFOSATO]': 'soja geneticamente modificada',
  }

  // Variantes da Celepar que representam o mesmo conceito do banco
  const CELEPAR_PARA_BANCO = { 'pinus sp': 'pinus', 'pinus ellioti': 'pinus' }
  // Banco usa "-" como separador solto (ex: "SOJA - GENETICAMENTE MODIFICADA");
  // remove antes de comparar pra não tratar como cultura diferente da Celepar.
  const normCultura = s => norm(s).replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim()
  const celNorm = s => { const n = normCultura(s); return CELEPAR_PARA_BANCO[n] ?? n }

  function celeparNormFor(cultura, cid) {
    const sub = BANCO_PARA_CELEPAR[String(cultura).toUpperCase().trim()]
    if (sub) return sub
    const row = db.prepare('SELECT celepar_nome FROM culturas WHERE culturaid = ?').get(cid)
    if (row?.celepar_nome) return normCultura(row.celepar_nome)
    return normCultura(cultura)
  }

  let conn
  try {
    conn = await oracleConn()

    let oracleResult
    if (!isAll) {
      oracleResult = await conn.execute(
        `SELECT DISTINCT c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO, d.NOMECIENTIFICO, a.ITEM AS AGROTOXICO_ITEM
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
         WHERE a.REGISTROMA = :ma
           AND r.CULTURAID = :culturaid
           AND r.ATIVO = 'S'
         ORDER BY d.SIAGROALV`,
        { ma, culturaid: Number(culturaid) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    } else {
      oracleResult = await conn.execute(
        `SELECT DISTINCT r.CULTURAID, c.NOME AS CULTURA, d.DIAGNOSTICOID, d.SIAGROALV, d.DESCRICAO AS DIAGNOSTICO, d.NOMECIENTIFICO, a.ITEM AS AGROTOXICO_ITEM
         FROM RECEITPADRAO r
         JOIN CULTURA c ON r.CULTURAID = c.CULTURAID
         JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
         JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
         WHERE a.REGISTROMA = :ma
           AND r.ATIVO = 'S'
         ORDER BY c.NOME, d.SIAGROALV`,
        { ma },
        { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
      )
    }

    const agrotoxicoId = oracleResult.rows[0]?.AGROTOXICO_ITEM ?? null

    // RESTRICAOCULTURA/RESTRICAODIAG — bloqueios ativos (UF=PR) já registrados no banco,
    // pra não tratar cultura/diagnóstico corretamente bloqueado como divergência
    let culturasBloqueadasBanco = new Set()
    let diagsBloqueadosBanco    = new Set()
    if (agrotoxicoId != null) {
      const [restCultura, restDiag] = await Promise.all([
        conn.execute(
          `SELECT CULTURAID FROM RESTRICAOCULTURA WHERE IDAGROTOXICO = :id AND UF = 'PR' AND ATIVO = 'S'`,
          { id: agrotoxicoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
        ),
        conn.execute(
          `SELECT CULTURAID, DIAGNOSTICOID FROM RESTRICAODIAG WHERE IDAGROTOXICO = :id AND UF = 'PR' AND ATIVO = 'S'`,
          { id: agrotoxicoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
        ),
      ])
      culturasBloqueadasBanco = new Set(restCultura.rows.map(r => r.CULTURAID))
      diagsBloqueadosBanco    = new Set(restDiag.rows.map(r => `${r.CULTURAID}:${r.DIAGNOSTICOID}`))
    }

    await conn.close(); conn = null

    const html           = await fetchPage(buildUrl(params))
    let   allCelepar     = parseRows(html)
    if (enrichLinkea) allCelepar = await enrichLinkeaRows(allCelepar)

    const celeparSets = {}
    const celeparRows = {}
    for (const r of allCelepar) {
      const n = celNorm(r.cultura)
      if (!celeparSets[n]) { celeparSets[n] = new Set(); celeparRows[n] = [] }
      celeparSets[n].add(String(r.siagro))
      celeparRows[n].push(r)
    }

    // Jaccard sobre conjunto de palavras: cobre pontuação diferente e reordenação
    const jaccard = (a, b) => {
      const sa = tokenize(a), sb = tokenize(b)
      const inter = [...sa].filter(w => sb.has(w)).length
      return inter / new Set([...sa, ...sb]).size
    }
    // Culturas onde banco e Celepar usam nomes ligeiramente diferentes
    const CULTURA_ALIASES = { 'pastagem': 'pastagens' }
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

    // Classificação por linha do Oracle, cruzando bloqueio de cultura/diagnóstico dos dois
    // lados (Adapar via culturaBloqueada/alvoBloqueado do scraper, banco via
    // RESTRICAOCULTURA/RESTRICAODIAG) — ver SPEC-restricao-cultura-cccb.md pra fórmula completa.
    const corretos   = []
    const errados    = []
    const bloqueados = []
    const cnToCulturaId = {}

    function classificarOracleRow(r, culturaidRow) {
      const cn = resolveKey(celeparNormFor(r.CULTURA, culturaidRow))
      cnToCulturaId[cn] = culturaidRow
      const item = { cultura: r.CULTURA, alvo_sb: r.SIAGROALV, diagnosticoid: r.DIAGNOSTICOID, diagnostico: r.DIAGNOSTICO, nomecientifico: r.NOMECIENTIFICO }

      const matched = celeparSets[cn] !== undefined
      if (!matched) { errados.push({ ...item, categoria: 'estrutural' }); return }

      const cRows  = celeparRows[cn] ?? []
      const celRow = cRows.find(cr => String(cr.siagro) === String(r.SIAGROALV))
      const culturaBloqAdapar = cRows[0]?.culturaBloqueada ?? false
      const diagBloqAdapar    = celRow?.alvoBloqueado ?? false
      const culturaBloqOracle = culturasBloqueadasBanco.has(culturaidRow)
      const diagBloqBanco     = diagsBloqueadosBanco.has(`${culturaidRow}:${r.DIAGNOSTICOID}`)

      if (culturaBloqOracle && !culturaBloqAdapar) { errados.push({ ...item, categoria: 'cultura' }); return }
      if (diagBloqBanco && !diagBloqAdapar)        { errados.push({ ...item, categoria: 'diagnostico' }); return }
      if (!celRow && !diagBloqBanco)                { errados.push({ ...item, categoria: 'diagnostico' }); return }

      const resultado = { ...item, alvo_siagro: r.SIAGROALV, nomeComumAlvo: celRow?.nomeComumAlvo ?? null }
      if (culturaBloqOracle || diagBloqBanco) bloqueados.push(resultado)
      else corretos.push(resultado)
    }

    if (!isAll) {
      for (const r of oracleResult.rows) classificarOracleRow(r, Number(culturaid))
    } else {
      for (const r of oracleResult.rows) classificarOracleRow(r, r.CULTURAID)
    }

    const oracleByKey = {}
    for (const r of oracleResult.rows) {
      const culturaidRow = isAll ? r.CULTURAID : Number(culturaid)
      const cn = resolveKey(celeparNormFor(r.CULTURA, culturaidRow))
      if (!oracleByKey[cn]) oracleByKey[cn] = new Set()
      oracleByKey[cn].add(String(r.SIAGROALV))
    }

    const celeparToCheck = isAll
      ? allCelepar
      : (celeparRows[resolveKey(celeparNormFor(oracleResult.rows[0]?.CULTURA ?? '', Number(culturaid)))] ?? [])

    const faltando                    = []
    const faltandoBloquearCultura     = []
    const culturaIdsFaltandoBloqueio  = new Set()
    const faltandoBloquearDiagnostico = []

    for (const r of celeparToCheck) {
      const cn            = celNorm(r.cultura)
      const oSet          = oracleByKey[cn] ?? new Set()
      const culturaidRow  = cnToCulturaId[cn] ?? null
      const culturaBloqOracle = culturaidRow != null && culturasBloqueadasBanco.has(culturaidRow)

      if (!oSet.has(String(r.siagro)))
        faltando.push({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null })

      if (r.culturaBloqueada && !culturaBloqOracle) {
        if (culturaidRow == null || !culturaIdsFaltandoBloqueio.has(culturaidRow)) {
          if (culturaidRow != null) culturaIdsFaltandoBloqueio.add(culturaidRow)
          faltandoBloquearCultura.push({ culturaid: culturaidRow, cultura: r.cultura })
        }
      } else if (!r.culturaBloqueada && r.alvoBloqueado) {
        faltandoBloquearDiagnostico.push({ culturaid: culturaidRow, cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null })
      }
    }

    // Anexa o DIAGNOSTICOID (código do banco) de cada alvo pendente de bloqueio — a Celepar só
    // devolve o SIAGROALV, quem sabe o DIAGNOSTICOID é o Oracle.
    if (faltandoBloquearDiagnostico.length) {
      const siagrosFaltantes = [...new Set(faltandoBloquearDiagnostico.map(r => String(r.siagro)))]
      let connLookup
      try {
        connLookup = await oracleConn()
        const binds = Object.fromEntries(siagrosFaltantes.map((s, i) => [`s${i}`, s]))
        const placeholders = siagrosFaltantes.map((_, i) => `:s${i}`).join(', ')
        const diagResult = await connLookup.execute(
          `SELECT DIAGNOSTICOID, SIAGROALV FROM DIAGNOSTICO WHERE SIAGROALV IN (${placeholders})`,
          binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
        )
        const diagnosticoIdBySiagro = new Map(diagResult.rows.map(d => [String(d.SIAGROALV), d.DIAGNOSTICOID]))
        for (const r of faltandoBloquearDiagnostico) r.diagnosticoid = diagnosticoIdBySiagro.get(String(r.siagro)) ?? null
      } catch (_) {
        // Não bloqueia a resposta principal — só fica sem diagnosticoid nesse caso
        for (const r of faltandoBloquearDiagnostico) r.diagnosticoid = null
      } finally {
        if (connLookup) await connLookup.close().catch(() => {})
      }
    }

    const celeparForResponse = isAll
      ? allCelepar.map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null }))
      : (celeparRows[resolveKey(celeparNormFor(oracleResult.rows[0]?.CULTURA ?? '', Number(culturaid)))] ?? [])
          .map(r => ({ cultura: r.cultura, siagro: r.siagro, alvo: r.alvo, nomeComumAlvo: r.nomeComumAlvo ?? null }))

    res.json({
      ok:      true,
      oracle:  oracleResult.rows.map(r => ({ cultura: r.CULTURA, siagroalv: r.SIAGROALV, diagnostico: r.DIAGNOSTICO, nomecientifico: r.NOMECIENTIFICO })),
      celepar: celeparForResponse,
      corretos,
      errados,
      faltando,
      bloqueados,
      faltandoBloquearCultura,
      faltandoBloquearDiagnostico,
      agrotoxicoItem: agrotoxicoId,
    })
  } catch (err) {
    oracleErrorResponse(res, err, 'cccb')
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
         JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
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
    oracleErrorResponse(res, err, 'diagnostico')
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
