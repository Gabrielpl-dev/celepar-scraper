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

module.exports = { norm, normSep, tokenize }
