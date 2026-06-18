require('dotenv').config()
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
app.use('/teste',      express.static(path.join(__dirname, '..', 'teste')));
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

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/agrofit-public'));

app.use('/api', requireAuth);
app.use('/api', require('./routes/celepar'));
app.use('/api', require('./routes/agrofit'));
app.use('/api', require('./routes/sigen'));
app.use('/api', require('./routes/banco'));
app.use('/api', require('./routes/internos'));
app.use('/api', require('./routes/extracao'));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🌱 AgroCheck rodando em http://0.0.0.0:${PORT}\n`);
  console.log(`  📡 Acessível na rede em http://<seu-ip>:${PORT}\n`);
});
