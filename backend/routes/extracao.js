const router     = require('express').Router();
const feedbackDb = require('../extracao/feedbackDb');
const { descobrir } = require('../extracao/descobrirKeywords');

// Registra correção humana: qual página era a certa para aquele campo
// Body: { pdfNome, campo, paginaCorreta, textoPagina? }
router.post('/extracao/feedback', (req, res) => {
  const { pdfNome, campo, paginaCorreta, textoPagina } = req.body;
  if (!pdfNome || !campo || paginaCorreta == null)
    return res.status(400).json({ ok: false, error: 'pdfNome, campo e paginaCorreta são obrigatórios' });

  feedbackDb.salvarFeedback(pdfNome, campo, Number(paginaCorreta), textoPagina ?? null);
  res.json({ ok: true });
});

// Lista keywords atuais (hardcoded + auto-descobertas)
router.get('/extracao/keywords', (req, res) => {
  res.json({ ok: true, keywords: feedbackDb.getKeywordsDinamicas() });
});

// Adiciona keyword manual para um campo
// Body: { campo, keyword }
router.post('/extracao/keywords', (req, res) => {
  const { campo, keyword } = req.body;
  if (!campo || !keyword)
    return res.status(400).json({ ok: false, error: 'campo e keyword são obrigatórios' });

  feedbackDb.salvarKeyword(campo, keyword, 'manual');
  res.json({ ok: true });
});

// Remove keyword
// Body: { campo, keyword }
router.delete('/extracao/keywords', (req, res) => {
  const { campo, keyword } = req.body;
  if (!campo || !keyword)
    return res.status(400).json({ ok: false, error: 'campo e keyword são obrigatórios' });

  feedbackDb.removerKeyword(campo, keyword);
  res.json({ ok: true });
});

// Dispara análise de frequência sobre o feedback acumulado
// Body opcional: { minOcorrencias: 0.5 }
router.post('/extracao/keywords/descobrir', (req, res) => {
  const { minOcorrencias = 0.5 } = req.body ?? {};
  const descobertos = descobrir(Number(minOcorrencias));
  res.json({ ok: true, descobertos });
});

module.exports = router;
