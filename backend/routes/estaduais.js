const express      = require('express')
const router       = express.Router()
const estaduais    = require('../lib/estaduais')
const sigenClient  = require('../lib/sigenClient')
const agrofitCsv   = require('../lib/agrofitCsv')
const agrofitApi   = require('../lib/agrofitApi')
const { fetchPesquisa, parsePesquisaRows } = require('../lib/scraper')
const { norm }      = require('../lib/normalizer')

// MA é a chave que todo verificador estadual usa — resolve a partir do nome via
// Agrofit (fonte federal, autoritativa pra MA), mesma fonte que `banco.js /buscar-produto`.
async function resolverMa(nome) {
  const [csvRows, apiRows] = await Promise.all([
    agrofitCsv.buscarPorNome(nome).catch(() => []),
    agrofitApi.buscarPorNome(nome).catch(() => []),
  ])
  const achado = [...csvRows, ...apiRows].find(r => r.ma?.trim())
  return achado?.ma?.trim() || null
}

// PR não tem verificação por MA (ver docs/sigen.md — só a Celepar/ADAPAR, que é por
// nome/cultura) — reaproveita o catálogo público já usado em `/api/verificar`.
async function verificarPR(nome) {
  const html = await fetchPesquisa().catch(() => null)
  if (!html) return { encontrado: null, erro: 'ADAPAR/PR indisponível' }
  const alvo   = norm(nome)
  const achado = parsePesquisaRows(html).find(r => {
    const n = norm(r.nome)
    return n.includes(alvo) || alvo.includes(n)
  })
  return achado ? { encontrado: true, nome: achado.nome, situacao: achado.situacao } : { encontrado: false }
}

// Verifica existência de um produto (por MA ou por nome, resolvido via Agrofit) nos
// sistemas estaduais implementados. Cada UF roda em paralelo; falha de uma não derruba
// as demais.
router.get('/estaduais', async (req, res) => {
  const { ma: maInput, nome } = req.query
  if (!maInput && !nome?.trim())
    return res.status(400).json({ ok: false, error: 'informe ma ou nome' })

  let ma = maInput
  if (!ma) {
    ma = await resolverMa(nome.trim())
    if (!ma) {
      return res.json({
        ok: true, nome: nome.trim(), ma: null, resultados: {},
        aviso: 'Produto não encontrado no Agrofit — sem MA não dá pra consultar os estados',
      })
    }
  } else if (!/^\d+$/.test(ma)) {
    return res.status(400).json({ ok: false, error: 'MA deve conter apenas dígitos' })
  }

  const fontes = {
    SC: () => sigenClient.verificarMA(ma),
    RO: () => estaduais.verificarRO(ma),
    GO: () => estaduais.verificarGO(ma),
    RN: () => estaduais.verificarRN(ma),
    ES: () => estaduais.verificarES(ma),
    ...(nome?.trim() ? { PR: () => verificarPR(nome.trim()) } : {}),
  }

  const entradas = await Promise.all(
    Object.entries(fontes).map(async ([uf, verificar]) => {
      try {
        return [uf, await verificar()]
      } catch (err) {
        return [uf, { encontrado: null, erro: err.message }]
      }
    })
  )

  res.json({ ok: true, nome: nome?.trim() || null, ma, resultados: Object.fromEntries(entradas) })
})

module.exports = router
