// node ouro_safra_comparar.js
// Chama os mesmos endpoints que o /teste-cccb usa (GET /api/buscar-produto,
// POST /api/cccb) contra o servidor já rodando — em vez de reimplementar a
// resolução de MA e a comparação Oracle x Celepar aqui, delega pro código que
// já está validado na UI. Roda no mesmo processo (mesmas env vars de
// AGROFIT_KEY/SECRET, JWT_SECRET etc.) que o PM2 usa, então o comportamento é
// idêntico ao da página.
// Saída: errados_banco_celepar.csv no mesmo diretório.

const fs       = require('fs')
const path     = require('path')
const readline = require('readline')
const { norm } = require('./backend/lib/normalizer')

const BASE_URL = process.env.OURO_SAFRA_BASE_URL || 'http://localhost:3000'
const GPL_USER = 'GPL_SCRAPER'

function ask(pergunta) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(pergunta, resposta => { rl.close(); resolve(resposta) }))
}

async function login() {
  const password = process.env.GPL_SCRAPER_PASSWORD || await ask('Senha do GPL_SCRAPER: ')
  const res  = await fetch(`${BASE_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: GPL_USER, password }),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Login falhou: ${data.error}`)
  return data.token
}

async function chamarApi(token, rota, opts = {}) {
  const res = await fetch(`${BASE_URL}${rota}`, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` },
  })
  return res.json()
}

// Mesmo critério de "melhor match" usado ao selecionar um resultado da busca:
// prioriza nome idêntico, senão o primeiro resultado que já tem MA resolvida.
function escolherMelhor(rows, nome) {
  const n     = norm(nome)
  const exact = rows.find(r => norm(r.nome) === n)
  return exact ?? rows.find(r => r.ma) ?? rows[0] ?? null
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
  'ORKESTRA SC','MIBELYA','NOMOLT 150','ACAPELA','HAMPTON 400 EC',
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
  const token = await login()
  console.log('Autenticado.\n')

  const errados = []

  for (let i = 0; i < PRODUTOS.length; i++) {
    const nome   = PRODUTOS[i]
    const prefix = `[${String(i + 1).padStart(3)}/${PRODUTOS.length}] ${nome}`

    try {
      const busca = await chamarApi(token, `/api/buscar-produto?nome=${encodeURIComponent(nome)}`)
      if (!busca.ok || !busca.rows.length) {
        console.log(`${prefix} → não cadastrado (sem resultado na busca)`)
        continue
      }

      const escolhido = escolherMelhor(busca.rows, nome)
      if (!escolhido?.ma) {
        console.log(`${prefix} → não cadastrado (sem MA na Agrofit)`)
        continue
      }
      if (!escolhido.cod) {
        console.log(`${prefix} → não encontrado no CELEPAR (MA: ${escolhido.ma})`)
        continue
      }

      const cccb = await chamarApi(token, '/api/cccb', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ culturaid: null, params: { ma: escolhido.ma, Cod: escolhido.cod } }),
      })
      if (!cccb.ok) {
        console.log(`${prefix} → ERRO: ${cccb.error}`)
        continue
      }
      if (!cccb.oracle.length) {
        console.log(`${prefix} → não cadastrado (sem registro no Oracle p/ MA ${escolhido.ma})`)
        continue
      }

      if (cccb.errados.length) {
        errados.push(nome)
        console.log(`${prefix} → ERRADO (MA: ${escolhido.ma} | celepar: "${escolhido.nome}" | banco: ${cccb.oracle.length} = ✓${cccb.corretos.length} + ✗${cccb.errados.length})`)
      }
    } catch (e) {
      console.log(`${prefix} → ERRO: ${e.message}`)
    }
  }

  const OUTPUT = path.join(__dirname, 'errados_banco_celepar.csv')
  fs.writeFileSync(OUTPUT, ['PRODUTO', ...errados].join('\n'), 'utf8')
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Errados: ${errados.length}`)
  console.log(`Salvo em: ${OUTPUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
