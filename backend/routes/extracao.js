const router     = require('express').Router();
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const { pdfToPng } = require('pdf-to-png-converter');
const feedbackDb = require('../extracao/feedbackDb');
const { descobrir } = require('../extracao/descobrirKeywords');
const { rodarExtracaoDual } = require('../extracao/dualExtracao');

const BULAS_DIR = path.join(__dirname, '../extracao/bulas');

const upload = multer({
  storage: multer.diskStorage({
    destination: BULAS_DIR,
    filename: (req, file, cb) => {
      const nomeSeguro = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_ ]/g, '_')}`;
      cb(null, nomeSeguro);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

// Roda a extração dual-provider e transmite o progresso campo a campo via SSE.
// Body: multipart, campo "pdf"
router.post('/extracao/rodar', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'arquivo pdf é obrigatório' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const enviar = evento => res.write(`data: ${JSON.stringify(evento)}\n\n`);

  try {
    for await (const evento of rodarExtracaoDual(req.file.path)) {
      enviar({ ...evento, pdfNome: req.file.filename });
    }
  } catch (err) {
    enviar({ tipo: 'erro', mensagem: err.message });
  } finally {
    res.end();
  }
});

// Serve a página do PDF renderizada em PNG (a mesma imagem que os providers de visão recebem).
const cachePaginas = new Map();
router.get('/extracao/pagina', async (req, res) => {
  const { pdf, pagina } = req.query;
  if (!pdf || !pagina) return res.status(400).json({ ok: false, error: 'pdf e pagina são obrigatórios' });

  const pdfPath = path.join(BULAS_DIR, path.basename(pdf));
  if (!fs.existsSync(pdfPath)) return res.status(404).json({ ok: false, error: 'pdf não encontrado' });

  const chave = `${pdf}:${pagina}`;
  let png = cachePaginas.get(chave);
  if (!png) {
    const [pagRenderizada] = await pdfToPng(pdfPath, { pagesToProcess: [Number(pagina)], viewportScale: 1.5, verbosityLevel: 0 });
    png = pagRenderizada.content;
    cachePaginas.set(chave, png);
  }

  res.setHeader('Content-Type', 'image/png');
  res.send(png);
});

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
