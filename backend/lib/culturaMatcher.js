const { norm, tokenize } = require('./normalizer')

// Nomes do banco que diferem do nome na Celepar — substitui antes de qualquer comparação
const BANCO_PARA_CELEPAR = {
  'PASTAGEM': 'pastagens',
  'MILHO O.G.M': 'milho geneticamente modificado',
  'SOJA - O.G.M [TOLERANTE AO GLIFOSATO]': 'soja geneticamente modificada',
  'ALGODÃO O.G.M': 'algodao geneticamente modificado',
  'ALGODÃO O.G.M(RESISTENTE A GLIFOSATO)': 'algodao geneticamente modificado',
}

// Variantes da Celepar que representam o mesmo conceito do banco
const CELEPAR_PARA_BANCO = { 'pinus sp': 'pinus', 'pinus ellioti': 'pinus' }

// Culturas onde banco e Celepar usam nomes ligeiramente diferentes
const CULTURA_ALIASES = { 'pastagem': 'pastagens' }

// Banco usa "-" como separador solto (ex: "SOJA - GENETICAMENTE MODIFICADA");
// remove antes de comparar pra não tratar como cultura diferente da Celepar.
function normCultura(s) {
  return norm(s).replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim()
}

function celNorm(s) {
  const n = normCultura(s)
  return CELEPAR_PARA_BANCO[n] ?? n
}

// db: instância do SQLite local de culturas (tabela `culturas`, coluna `celepar_nome`)
function celeparNormFor(cultura, cid, db) {
  const sub = BANCO_PARA_CELEPAR[String(cultura).toUpperCase().trim()]
  if (sub) return sub
  const row = db.prepare('SELECT celepar_nome FROM culturas WHERE culturaid = ?').get(cid)
  if (row?.celepar_nome) return normCultura(row.celepar_nome)
  return normCultura(cultura)
}

// Jaccard sobre conjunto de palavras: cobre pontuação diferente e reordenação
function jaccard(a, b) {
  const sa = tokenize(a), sb = tokenize(b)
  const inter = [...sa].filter(w => sb.has(w)).length
  return inter / new Set([...sa, ...sb]).size
}

function resolveKey(cn, celeparSets) {
  if (celeparSets[cn]) return cn
  const alias = CULTURA_ALIASES[cn]
  if (alias && celeparSets[alias]) return alias

  let bestKey = null, bestScore = 0
  for (const key of Object.keys(celeparSets)) {
    const score = jaccard(cn, key)
    if (score > bestScore) { bestScore = score; bestKey = key }
  }
  // Match perfeito de tokens (ex: "algodao cultivar cnpa/ita 90" vs "algodao (cultivar
  // cnpa/ita 90)" — só difere em pontuação) tem prioridade sobre o prefixo abaixo, que é
  // ingênuo demais: "ALGODÃO - Cultivar CNPA/ITA-90" normalizado vira prefixo textual de
  // "algodao" e roubava esse match, apesar de existir uma cultura mais específica e idêntica
  // por tokens — misturava o culturaid de "Algodão" com o de "Algodão (cultivar ...)" e fazia
  // a cultura específica nunca resolver seu próprio culturaid (bloqueio real no banco não era
  // reconhecido — falso positivo em "faltando bloquear cultura").
  if (bestScore >= 0.999) return bestKey

  // Prefix match: banco pode ter nome mais curto (ex: PINUS vs PINUS SP)
  const prefixKey = Object.keys(celeparSets).find(k => k.startsWith(cn + ' ') || cn.startsWith(k + ' '))
  if (prefixKey) return prefixKey

  return (bestScore >= 0.8 && bestKey) ? bestKey : cn
}

module.exports = { BANCO_PARA_CELEPAR, CELEPAR_PARA_BANCO, normCultura, celNorm, celeparNormFor, jaccard, resolveKey }
