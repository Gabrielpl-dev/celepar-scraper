const norm = s => String(s || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLowerCase()

const normSep = s => norm(s).replace(/[/;|]+/g, ' ').replace(/\s+/g, ' ').trim()

const tokenize = s => {
  const n = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return new Set(n.replace(/[^a-z0-9 ]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(Boolean))
}

// MA/registro é sempre dígitos, mas cada fonte cadastra sem zero à esquerda de forma
// inconsistente (a Agrofit devolve "01323", o SIGEN só acha "1323") — normaliza antes de
// comparar ou consultar. Um valor não-numérico (registro composto/pendente, ex. "B46 +
// P53") fica intocado, nunca bate com uma consulta por MA (que é sempre só dígitos).
function normMa(v) {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, '') : s
}

module.exports = { norm, normSep, tokenize, normMa }
