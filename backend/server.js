require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

if (process.env.ALLOWED_ORIGIN) {
  app.use('/api', cors({ origin: process.env.ALLOWED_ORIGIN }))
}
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/extracao',   (_req, res) => res.sendFile(path.join(__dirname, 'public', 'extracao.html')));
app.get('/extracao/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'extracao.html')));
app.use('/banco',      express.static(path.join(__dirname, '..', 'banco')));
app.use('/caminhos',   express.static(path.join(__dirname, '..', 'caminhos')));
app.use('/teste-cccb', express.static(path.join(__dirname, '..', 'teste-cccb')));
app.get('/shared/api.js', (_req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'src', 'api.js')));
app.get('/banco/internos', (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'banco', 'internos.html'))
);
app.get('/banco/:tabela', (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'banco', 'tabela.html'))
);

const requireAuth = require('./middleware/requireAuth');

const rotasComFalha = []

// Isolamento de falha: erro ao carregar uma rota não derruba o boot do servidor
// inteiro — só aquele domínio fica indisponível (404), o resto segue no ar.
function montarRota(nome, caminho) {
  try {
    app.use('/api', require(caminho))
  } catch (err) {
    rotasComFalha.push(nome)
    console.error(`[boot] rota "${nome}" falhou ao carregar — endpoints desse módulo ficam indisponíveis (404):\n`, err)
  }
}

montarRota('auth', './routes/auth');
montarRota('agrofit-public', './routes/agrofit-public');

app.use('/api', requireAuth);
montarRota('celepar', './routes/celepar');
montarRota('agrofit', './routes/agrofit');
montarRota('sigen', './routes/sigen');
montarRota('banco', './routes/banco');
montarRota('internos', './routes/internos');
montarRota('extracao', './routes/extracao');

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now(), rotasComFalha }));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🌱 AgroCheck rodando em http://0.0.0.0:${PORT}\n`);
  console.log(`  📡 Acessível na rede em http://<seu-ip>:${PORT}\n`);
});

// Graceful shutdown: fecha conexoes ativas e libera a porta antes de sair
function shutdown() {
  if (server.closeAllConnections) server.closeAllConnections()
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
