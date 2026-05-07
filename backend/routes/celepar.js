const express = require('express');
const cheerio = require('cheerio');
const {
  norm, buildUrl, fetchPage, fetchPesquisa,
  parseRows, parsePesquisaRows,
  validateListarStructure, validatePesquisaStructure,
} = require('../lib/scraper');

const router = express.Router();

router.get('/listar', async (req, res) => {
  try {
    const url      = buildUrl(req.query);
    const html     = await fetchPage(url);
    const rows     = parseRows(html);
    const warnings = validateListarStructure(cheerio.load(html), rows);
    if (warnings.length) console.warn('[estrutura]', warnings);
    res.json({ ok: true, total: rows.length, url, rows, warnings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/buscar-siagro', async (req, res) => {
  try {
    const { siagro, params = {} } = req.body;
    if (!siagro) return res.status(400).json({ ok: false, error: 'siagro é obrigatório' });
    const html     = await fetchPage(buildUrl(params));
    const rows     = parseRows(html);
    const warnings = validateListarStructure(cheerio.load(html), rows);
    if (warnings.length) console.warn('[estrutura]', warnings);
    const alvo     = String(siagro).trim();
    const unicas   = [...new Map(
      rows.filter(r => r.siagro === alvo).map(r => [r.cultura, r])
    ).values()];
    res.json({ ok: true, siagro: alvo, total: unicas.length, rows: unicas, warnings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/extrair-cultura', async (req, res) => {
  try {
    const { cultura, params = {} } = req.body;
    const html     = await fetchPage(buildUrl(params));
    const rows     = parseRows(html);
    const warnings = validateListarStructure(cheerio.load(html), rows);
    if (warnings.length) console.warn('[estrutura]', warnings);
    const alvo     = norm(cultura);
    const filtrados = alvo ? rows.filter(r => norm(r.cultura) === alvo) : rows;
    res.json({ ok: true, cultura, total: filtrados.length, rows: filtrados, warnings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/comparar', async (req, res) => {
  try {
    const { cultura1, cultura2, params = {} } = req.body;
    if (!cultura1 || !cultura2)
      return res.status(400).json({ ok: false, error: 'cultura1 e cultura2 são obrigatórias' });
    const html     = await fetchPage(buildUrl(params));
    const rows     = parseRows(html);
    const warnings = validateListarStructure(cheerio.load(html), rows);
    if (warnings.length) console.warn('[estrutura]', warnings);
    const a1 = norm(cultura1), a2 = norm(cultura2);
    const m1 = new Map(), m2 = new Map();
    rows.forEach(r => {
      if (norm(r.cultura) === a1) m1.set(r.siagro, r.alvo);
      if (norm(r.cultura) === a2) m2.set(r.siagro, r.alvo);
    });
    const exclusivos1 = [], exclusivos2 = [], comuns = [];
    for (const [siagro, alvo] of m1) {
      m2.has(siagro) ? comuns.push({ siagro, alvo1: alvo, alvo2: m2.get(siagro) })
                     : exclusivos1.push({ siagro, alvo });
    }
    for (const [siagro, alvo] of m2) {
      if (!m1.has(siagro)) exclusivos2.push({ siagro, alvo });
    }
    res.json({ ok: true, cultura1, cultura2, total1: m1.size, total2: m2.size, exclusivos1, exclusivos2, comuns, warnings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/verificar', async (req, res) => {
  try {
    const { termo } = req.body;
    if (!termo) return res.status(400).json({ ok: false, error: 'termo é obrigatório' });
    const html     = await fetchPesquisa();
    const rows     = parsePesquisaRows(html);
    const warnings = validatePesquisaStructure(cheerio.load(html), rows);
    if (warnings.length) console.warn('[estrutura]', warnings);
    const filtered = rows.filter(r => norm(r.nome).includes(norm(termo)));
    res.json({ ok: true, termo, total: filtered.length, rows: filtered, warnings });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
