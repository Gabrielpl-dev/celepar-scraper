const express = require('express');
const cheerio = require('cheerio');
const db      = require('../db');

const router = express.Router();

const UPSERT = db.prepare(`
  INSERT INTO agrofit_ids (nome, id, atualizado)
  VALUES (?, ?, datetime('now','localtime'))
  ON CONFLICT(nome) DO UPDATE SET id=excluded.id, atualizado=excluded.atualizado
`);

router.get('/agrofit', async (req, res) => {
  try {
    const { nome, id } = req.query;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome é obrigatório' });

    const qs = new URLSearchParams({
      p_id_produto: '', p_nm_marca_comercial: nome,
      p_id_registrante_empresa: '', p_id_ingrediente_ativo: '',
      p_nm_comum_portugues: '', p_id_tecnica_aplicacao: '',
      p_id_classe: '', p_nr_registro: '',
      p_id_classificacao_tox: '', p_id_classificacao_amb: '',
      p_tipo_aplicacao: 'C', p_id_cultura: '',
      p_id_praga_inseto: '', p_id_cultura_planta: '',
      p_id_planta_daninha: '', p_id_cultura_praga: '',
      p_id_cultura_inseto: '', p_id_praga: '',
      p_nm_sort: 'nm_marca_comercial', p_linha_inicial: '0',
      p_id_produto_formulado_tecnico: id || '',
    });

    const fetchRes = await fetch(
      `https://agrofit.agricultura.gov.br/agrofit_cons/!ap_produto_form_detalhe_cons?${qs}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' } }
    );
    if (!fetchRes.ok) throw new Error(`Agrofit respondeu HTTP ${fetchRes.status}`);

    const buf = Buffer.from(await fetchRes.arrayBuffer());
    let html;
    try { html = new TextDecoder('windows-1252').decode(buf); }
    catch { html = buf.toString('latin1'); }

    const $             = cheerio.load(html);
    const nomeConfirmado = $('input[name="p_nm_marca_comercial"]').val() || nome;

    const docsMap = new Map();
    $('a[href*="p_id_file"]').each((_, a) => {
      const href    = $(a).attr('href') || '';
      const idMatch = href.match(/p_id_file=(\d+)/);
      if (!idMatch) return;
      const fileId = idMatch[1];
      if (!docsMap.has(fileId)) docsMap.set(fileId, { href, textos: [] });
      docsMap.get(fileId).textos.push($(a).text().trim());
    });

    const documentos = [];
    for (const [fileId, { href, textos }] of docsMap) {
      documentos.push({
        fileId,
        nomeArquivo: textos[0] || '',
        tipo:        textos[1] || '',
        data:        textos[2] || '',
        url: `https://agrofit.agricultura.gov.br/agrofit_cons/${href}`,
      });
    }

    if (id) UPSERT.run((nome || nomeConfirmado).trim().toLowerCase(), String(id));

    res.json({
      ok: true,
      nome: nomeConfirmado,
      id: id || null,
      documentos,
      aviso: documentos.length === 0 && !id
        ? 'Sem documentos — informe o ID Agrofit do produto para obter bulas'
        : null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/agrofit-ids', (req, res) => {
  const rows = db.prepare('SELECT nome, id, atualizado FROM agrofit_ids ORDER BY nome').all();
  res.json({ ok: true, ids: rows });
});

router.post('/agrofit-ids', (req, res) => {
  const { nome, id } = req.body;
  if (!nome || !id) return res.status(400).json({ ok: false, error: 'nome e id obrigatórios' });
  UPSERT.run(nome.trim().toLowerCase(), String(id));
  res.json({ ok: true });
});

router.delete('/agrofit-ids/:nome', (req, res) => {
  db.prepare('DELETE FROM agrofit_ids WHERE nome = ?').run(req.params.nome.toLowerCase());
  res.json({ ok: true });
});

router.get('/agrofit-pdf', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.includes('agrofit.agricultura.gov.br'))
    return res.status(400).json({ ok: false, error: 'URL inválida' });
  try {
    // Espaços no p_nm_file causam 503 no servidor do Agrofit
    const fetchRes = await fetch(url.replace(/ /g, '%20'), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://agrofit.agricultura.gov.br/',
        'Accept': 'application/pdf,application/octet-stream,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!fetchRes.ok) return res.status(fetchRes.status).json({ ok: false, error: `Agrofit ${fetchRes.status}` });
    const ct = fetchRes.headers.get('content-type') || 'application/octet-stream';
    const cl = fetchRes.headers.get('content-length');
    res.set('Content-Type', ct);
    res.set('Content-Disposition', 'inline');
    if (cl) res.set('Content-Length', cl);
    res.send(Buffer.from(await fetchRes.arrayBuffer()));
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
