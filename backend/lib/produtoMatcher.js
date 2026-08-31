const { normSep } = require('./normalizer')

// Merge Celepar->Agrofit por prefixo de nome (cobre truncacao mid-word: "OpteraPr" casa com "OpteraPro")
// Requer que o prefixo não termine em espaço — evita casar variantes distintas ("Dorai" vs "Dorai Max")
function isTruncMatch(shorter, longer) {
  return longer.startsWith(shorter) && !longer.slice(shorter.length).startsWith(' ')
}

// Um único MA na Agrofit pode agrupar várias marcas comerciais (ex: "Clopanto; Nanofos;
// Teminator;"), enquanto a Celepar cadastra cada marca como produto separado. Comparar
// contra a string toda faria "clopanto" virar "clopanto nanofos teminator" (';' -> ' '
// no normSep) e cair na guarda anti-falso-positivo acima. Por isso casa contra cada
// marca individualmente.
function splitAliases(nome) {
  return nome.split(/[/;|]+/).map(normSep).filter(Boolean)
}

// Casa cada linha da Celepar contra os produtos da Agrofit (Map ma/nome -> registro) por
// nome/alias -- o que casar ganha `cod`/`fonte: 'ambos'` (muta o registro de `byMa` in-place,
// mesmo comportamento de antes); o que não casar em nenhum vira "orphan" (só existe na
// Celepar/Adapar), devolvido pra quem chamou incluir na lista final.
function mesclarCeleparNaAgrofit(celeparRows, byMa) {
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
  return celeparOrphans
}

module.exports = { isTruncMatch, mesclarCeleparNaAgrofit }
