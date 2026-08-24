/**
 * Compara RECEITPADRAO (Oracle) com CELEPAR para cada produto da lista.
 * Retorna apenas os produtos com cadastros ERRADOS: Oracle tem SIAGROALV que o CELEPAR não reconhece.
 * Cadastros faltando (CELEPAR tem siagro que Oracle não tem) são ignorados.
 *
 * Saída: ouro-safra/docs/errados_banco_celepar.csv
 */

const fs       = require('fs')
const path     = require('path')
const oracledb = require('oracledb')
const { fetchPesquisa, parsePesquisaRows, fetchPage, parseRows, buildUrl, norm } = require('./backend/lib/scraper')

const INPUT  = path.join(__dirname, '..', 'ouro-safra', 'docs', 'produtos_normalizados.csv')
const OUTPUT = path.join(__dirname, '..', 'ouro-safra', 'docs', 'errados_banco_celepar.csv')

try { oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_15' }) }
catch (_) { console.warn('[oracle] Instant Client nao encontrado — usando Thin mode') }

async function oracleConn() {
  const conn = await oracledb.getConnection({
    user:          process.env.ORACLE_USER,
    password:      process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  })
  await conn.execute('ALTER SESSION SET CURRENT_SCHEMA = VIASOFT')
  return conn
}

async function getMa(conn, nome) {
  const r = await conn.execute(
    `SELECT REGISTROMA FROM AGROTOXICO WHERE UPPER(NOME) = UPPER(:nome) AND ROWNUM = 1`,
    { nome },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  )
  return r.rows[0]?.REGISTROMA ?? null
}

async function getOracleRegistros(conn, ma) {
  const r = await conn.execute(
    `SELECT DISTINCT d.SIAGROALV, c.NOME AS CULTURA
     FROM RECEITPADRAO r
     JOIN CULTURA     c ON r.CULTURAID    = c.CULTURAID
     JOIN DIAGNOSTICO d ON r.DIAGNOSTICOID = d.DIAGNOSTICOID
     JOIN AGROTOXICO  a ON r.DESCRICAO    = a.NOME
     WHERE a.REGISTROMA = :ma AND r.ATIVO = 'S'`,
    { ma },
    { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows: 0 }
  )
  return r.rows
}

async function getCeleparSets(todosNomes, nome) {
  const n          = norm(nome)
  const candidates = todosNomes
    .filter(r => { const rn = norm(r.nome); return rn === n || rn.includes(n) || n.includes(rn) })
    .sort((a, b) => Math.abs(norm(a.nome).length - n.length) - Math.abs(norm(b.nome).length - n.length))
  const match = candidates[0]
  if (!match?.cod) return null

  const html = await fetchPage(buildUrl({ Cod: match.cod }))
  const sets = {}
  for (const r of parseRows(html)) {
    const k = norm(r.cultura)
    if (!sets[k]) sets[k] = new Set()
    sets[k].add(String(r.siagro))
  }
  return sets
}

function lerCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] || '').trim()]))
  })
}

async function main() {
  const produtos = lerCsv(INPUT)
  console.log(`${produtos.length} produtos para verificar.\n`)

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

  const errados = []

  for (let i = 0; i < produtos.length; i++) {
    const nome = produtos[i].PRODUTO
    process.stdout.write(`[${String(i + 1).padStart(3)}/${produtos.length}] ${nome} ... `)

    try {
      const ma = await getMa(conn, nome)
      if (!ma) { console.log('sem MA'); continue }

      const oracleRows = await getOracleRegistros(conn, ma)
      if (!oracleRows.length) { console.log('sem receituario'); continue }

      const celeparSets = await getCeleparSets(todosNomes, nome)
      if (!celeparSets) { console.log('nao encontrado no CELEPAR'); continue }

      const temErro = oracleRows.some(row => {
        const cSet = celeparSets[norm(row.CULTURA)] ?? new Set()
        return !cSet.has(String(row.SIAGROALV))
      })

      if (temErro) errados.push(nome)
      console.log(temErro ? 'ERRADO' : 'ok')
    } catch (e) {
      console.log(`ERRO: ${e.message}`)
    }
  }

  await conn.close().catch(() => {})

  fs.writeFileSync(OUTPUT, ['PRODUTO', ...errados].join('\n'), 'utf8')
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Errados: ${errados.length}`)
  console.log(`Salvo em: ${OUTPUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
