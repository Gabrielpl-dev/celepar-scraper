const express    = require('express');
const cheerio    = require('cheerio');
const db         = require('../db');
const agrofitApi   = require('../lib/agrofitApi');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

const UPSERT = db.prepare(`
  INSERT INTO agrofit_ids (ma, id, nome, atualizado)
  VALUES (?, ?, ?, datetime('now','localtime'))
  ON CONFLICT(ma) DO NOTHING
`);

router.get('/agrofit', async (req, res) => {
  try {
    const { ma, id } = req.query;
    if (!ma) return res.status(400).json({ ok: false, error: 'ma (registro) é obrigatório' });
    if (!/^\d+$/.test(ma)) return res.status(400).json({ ok: false, error: 'MA deve conter apenas dígitos' });

    const qs = new URLSearchParams({
      p_id_produto: '', p_nm_marca_comercial: '',
      p_id_registrante_empresa: '', p_id_ingrediente_ativo: '',
      p_nm_comum_portugues: '', p_id_tecnica_aplicacao: '',
      p_id_classe: '', p_nr_registro: ma,
      p_id_classificacao_tox: '', p_id_classificacao_amb: '',
      p_tipo_aplicacao: 'C', p_id_cultura: '',
      p_id_praga_inseto: '', p_id_cultura_planta: '',
      p_id_planta_daninha: '', p_id_cultura_praga: '',
      p_id_cultura_inseto: '', p_id_praga: '',
      p_nm_sort: 'nm_marca_comercial', p_linha_inicial: '0',
      p_id_produto_formulado_tecnico: id || '',
    });

    const fetchRes = await fetch(
      `https://agrofit.agricultura.gov.br/agrofit_cons/!ap_produto_form_detalhe_cons?${qs.toString().replace(/\+/g, '%20')}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' } }
    );
    if (!fetchRes.ok) throw new Error(`Agrofit respondeu HTTP ${fetchRes.status}`);

    const buf = Buffer.from(await fetchRes.arrayBuffer());
    let html;
    try { html = new TextDecoder('windows-1252').decode(buf); }
    catch { html = buf.toString('latin1'); }

    const $             = cheerio.load(html);
    const nomeConfirmado = $('input[name="p_nm_marca_comercial"]').val() || '';

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

    if (id) UPSERT.run(ma.trim(), String(id), nomeConfirmado.trim() || null);

    res.json({
      ok: true,
      nome: nomeConfirmado,
      ma,
      id: id || null,
      documentos,
      aviso: documentos.length === 0 && !id
        ? 'Sem documentos — informe o ID Agrofit do produto para obter bulas'
        : null,
    });
  } catch (err) {
    console.error('[agrofit/scrape]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
});

router.get('/agrofit-status', async (req, res) => {
  const user   = process.env.AGROFIT_USER
  const pass   = process.env.AGROFIT_PASSWORD
  const key    = process.env.AGROFIT_KEY
  const secret = process.env.AGROFIT_SECRET
  const vars = {
    AGROFIT_USER:     !!user,
    AGROFIT_PASSWORD: !!pass,
    AGROFIT_KEY:      !!key,
    AGROFIT_SECRET:   !!secret,
  }

  let tokenStatus = null, tokenOk = false, tokenErr = null
  if (key && secret) {
    try {
      const basic = Buffer.from(`${key}:${secret}`).toString('base64')
      const r = await fetch('https://api.cnptia.embrapa.br/token', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(10_000),
      })
      tokenStatus = r.status
      const body  = await r.json().catch(() => null)
      tokenOk     = r.ok && !!body?.access_token
    } catch (e) {
      tokenErr = e.message
    }
  }

  res.json({ ok: true, vars, tokenStatus, tokenOk, tokenErr })
})

router.get('/agrofit-docs', async (req, res) => {
  const { ma: maParam, cod } = req.query
  let ma = maParam?.trim()

  if (ma && !/^\d+$/.test(ma))
    return res.status(400).json({ ok: false, error: 'ma deve conter apenas dígitos' })
  if (!ma && !cod)
    return res.status(400).json({ ok: false, error: 'ma ou cod são obrigatórios' })

  try {
    let result = ma ? await agrofitApi.buscarDocumentos(ma) : null

    if (!result && cod) {
      const row = db.prepare('SELECT ma FROM produto_registry WHERE cod = ?').get(cod)
      if (row?.ma) {
        ma = row.ma
        result = await agrofitApi.buscarDocumentos(ma)
      }
    }

    if (!result)
      return res.json({ ok: true, ma, nome: null, documentos: [], aviso: 'Produto não encontrado na API Agrofit' })
    res.json({ ok: true, ...result })
  } catch (err) {
    console.error('[agrofit-docs]', err)
    res.status(500).json({ ok: false, error: 'Erro interno do servidor' })
  }
})

router.get('/agrofit-ids', (req, res) => {
  const rows = db.prepare('SELECT ma, id, nome, atualizado FROM agrofit_ids ORDER BY ma').all();
  res.json({ ok: true, ids: rows });
});

router.post('/agrofit-ids', requireAdmin, (req, res) => {
  const { ma, id, nome } = req.body;
  if (!ma || !id) return res.status(400).json({ ok: false, error: 'ma e id obrigatórios' });
  UPSERT.run(ma.trim(), String(id), nome?.trim() || null);
  res.json({ ok: true });
});

router.post('/agrofit-ids/link-cod', (req, res) => {
  const { ma, cod } = req.body;
  if (!ma || !cod) return res.status(400).json({ ok: false, error: 'ma e cod obrigatorios' });
  db.prepare(`INSERT INTO agrofit_ids (ma, id, cod) VALUES (?, '', ?)
    ON CONFLICT(ma) DO UPDATE SET cod = excluded.cod`).run(ma.trim(), String(cod).trim());
  res.json({ ok: true });
});

router.delete('/agrofit-ids/:ma', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM agrofit_ids WHERE ma = ?').run(req.params.ma.trim());
  res.json({ ok: true });
});

module.exports = router;
