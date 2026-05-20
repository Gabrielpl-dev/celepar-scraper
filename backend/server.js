require('dotenv').config()
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/teste', express.static(path.join(__dirname, '..', 'teste')));
app.use('/banco', express.static(path.join(__dirname, '..', 'banco')));

app.use('/api', require('./routes/celepar'));
app.use('/api', require('./routes/agrofit'));
app.use('/api', require('./routes/sigen'));
app.use('/api', require('./routes/banco'));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🌱 Celepar Scraper rodando em http://0.0.0.0:${PORT}\n`);
  console.log(`  📡 Acessível na rede em http://<seu-ip>:${PORT}\n`);
});
