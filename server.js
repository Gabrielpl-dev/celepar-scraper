// ============================================================
// Reag Celepar Scraper — backend
// Faz o fetch da página de listagem do site celepar07web.pr.gov.br,
// extrai as linhas da tabela e expõe endpoints que reproduzem a
// lógica dos 4 scripts originais de DevTools.
// ============================================================

const express = require('express');
const cors    = require('cors');
const cheerio = require('cheerio');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BASE_URL    = 'https://celepar07web.pr.gov.br/agrotoxicos/listar.asp';
const PESQUISA_URL = 'https://celepar07web.pr.gov.br/agrotoxicos/resultadoPesquisa.asp';
const PESQUISA_KEY = '__pesquisa__';
// Payload fixo — equivale a clicar "Pesquisar" sem filtros no facapesquisa.asp
const PESQUISA_BODY = new URLSearchParams({
  criterioAgrotoxico: '', criterioIngredienteAtivo: '', criterioRegistrante: '',
  criterioClassificacaoToxicologica: '', criterioPraga: '', criterioSituacao: '',
  criterioClasse: '', criterioCulturaInfestada: '', criterioExpurgo: '',
  criterioAplicacaoAerea: '', criterioTratamentoSementes: '',
  select11: 'null', select1: '', select5: 'null', select4: 'null',
  select9: 'null', select6: 'null', select3: 'null', select7: 'null',
  descIngrediente: '', numeroRegistro: '', ClassificacaoQuiBio: 'QUI',
  submit1: 'Pesquisar'
}).toString();

// ---------- helpers ----------

const norm = s => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

// Reconstrói os params no formato exato que o site espera (com "null" literal pra strings vazias).
function buildUrl(params) {
  const defaults = {
    Cod: '',
    descIngrediente: '',
    CodIngredienteAtivo: 'null',
    CodFormulacao: 'null',
    IdRegistrante: 'null',
    CodFormaAcao: 'null',
    CodAlvo: 'null',
    CodGrupoQuimico: 'null',
    CodClassToxicologica: 'null',
    CodSituacao: 'null',
    CodClassificacao: 'null',
    CodEspecie: 'null',
    CodAgrotoxico: 'null',
    NumeroRegistro: 'null',
    expurgo: 'null',
    aplica: 'null',
    tratam: 'null',
    ClassificacaoQuiBio: 'null',
    criterioAgrotoxico: '',
    criterioIngredienteAtivo: '',
    criterioRegistrante: '',
    criterioClassificacaoToxicologica: '',
    criterioPraga: '',
    criterioSituacao: '',
    criterioClasse: '',
    criterioCulturaInfestada: '',
    criterioExpurgo: '',
    criterioAplicacaoAerea: '',
    criterioTratamentoSementes: ''
  };

  const merged = { ...defaults, ...params };
  const qs = Object.entries(merged)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
    .join('&');
  return `${BASE_URL}?${qs}`;
}

// Cache simples em memória (TTL 5min) — pra não martelar o servidor do PR a cada mudança de filtro.
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchPage(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.html;
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao buscar ${url}`);
  }

  // O site costuma servir em ISO-8859-1 (windows-1252). Vamos decodificar como tal.
  const buf = Buffer.from(await res.arrayBuffer());
  let html;
  try {
    html = new TextDecoder('windows-1252').decode(buf);
  } catch {
    html = buf.toString('latin1');
  }

  cache.set(url, { html, ts: Date.now() });
  return html;
}

async function fetchPesquisa() {
  const cached = cache.get(PESQUISA_KEY);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.html;

  const res = await fetch(PESQUISA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    },
    body: PESQUISA_BODY
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar resultadoPesquisa`);

  const buf = Buffer.from(await res.arrayBuffer());
  let html;
  try { html = new TextDecoder('windows-1252').decode(buf); }
  catch { html = buf.toString('latin1'); }

  cache.set(PESQUISA_KEY, { html, ts: Date.now() });
  return html;
}

function parsePesquisaRows(html) {
  const $ = cheerio.load(html);
  const rows = [];

  $('table#tb1 tr').slice(1).each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length < 4) return;

    const linkEl = $(tds[0]).find('a').first();
    const nome = linkEl.text().trim();
    if (!nome) return;

    const href = linkEl.attr('href') || '';
    const codMatch = href.match(/[?&]Cod=(\d+)/);
    const cod = codMatch ? codMatch[1] : null;

    const statusTd = $(tds[1]);
    const colorFont = statusTd.find('font[color]').first();
    let situacao, cor;
    if (colorFont.length) {
      situacao = colorFont.text().trim();
      cor = colorFont.attr('color').toLowerCase();
    } else {
      situacao = statusTd.text().trim();
      cor = null;
    }

    rows.push({
      nome,
      cod,
      situacao,
      cor,
      classificacao: $(tds[2]).text().trim(),
      empresa:       $(tds[3]).text().trim()
    });
  });

  return rows;
}

// Replica o querySelectorAll('tr') + leitura dos tds dos scripts originais.
// Retorna um array de { cultura, cod2, alvo, produtos: [{ nome, cor }] }
function parseRows(html) {
  const $ = cheerio.load(html);
  const linhas = [];

  $('tr').each((_, tr) => {
    const $tr  = $(tr);
    const $tds = $tr.children('td');
    if ($tds.length < 4) return;

    const $a = $tds.eq(0).find('a').first();
    if (!$a.length) return;

    const onclick = $a.attr('onclick') || '';
    const m = onclick.match(/Cod2=(\d+)/);
    if (!m) return;

    // Extrai cor do <font> dentro da linha (script "Verificar se ta ok").
    const produtos = [];
    $tr.find('font').each((__, f) => {
      const $f = $(f);
      const txt = $f.text().trim();
      const cor = $f.attr('color') || null;
      if (txt) produtos.push({ nome: txt, cor });
    });

    linhas.push({
      cultura: $a.text().trim(),
      cod2:    m[1],
      alvo:    $tds.eq(2).text().trim(),
      rawText: $tr.text().replace(/\s+/g, ' ').trim(),
      produtos
    });
  });

  return linhas;
}

// ---------- API ----------

// GET /api/listar?Cod=2968  → devolve todas as linhas parseadas
app.get('/api/listar', async (req, res) => {
  try {
    const url  = buildUrl(req.query);
    const html = await fetchPage(url);
    const rows = parseRows(html);
    res.json({ ok: true, total: rows.length, url, rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/buscar-cod2  { cod2, params }  → reproduz "Busca por Cod2.js"
app.post('/api/buscar-cod2', async (req, res) => {
  try {
    const { cod2, params = {} } = req.body;
    if (!cod2) return res.status(400).json({ ok: false, error: 'cod2 é obrigatório' });

    const html = await fetchPage(buildUrl(params));
    const rows = parseRows(html);

    const alvo = String(cod2).trim();
    const filtrados = rows.filter(r => r.cod2 === alvo);

    // Único por cultura
    const unicas = [...new Map(filtrados.map(r => [r.cultura, r])).values()];

    res.json({ ok: true, cod2: alvo, total: unicas.length, rows: unicas });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/extrair-cultura  { cultura, params }  → "Extrator Cod2 por cultura.js"
app.post('/api/extrair-cultura', async (req, res) => {
  try {
    const { cultura, params = {} } = req.body;

    const html = await fetchPage(buildUrl(params));
    const rows = parseRows(html);

    const alvo = norm(cultura);
    const filtrados = alvo ? rows.filter(r => norm(r.cultura) === alvo) : rows;

    res.json({ ok: true, cultura, total: filtrados.length, rows: filtrados });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/comparar  { cultura1, cultura2, params }  → "Comparador de Cod2.js"
app.post('/api/comparar', async (req, res) => {
  try {
    const { cultura1, cultura2, params = {} } = req.body;
    if (!cultura1 || !cultura2) {
      return res.status(400).json({ ok: false, error: 'cultura1 e cultura2 são obrigatórias' });
    }

    const html = await fetchPage(buildUrl(params));
    const rows = parseRows(html);

    const a1 = norm(cultura1);
    const a2 = norm(cultura2);

    const m1 = new Map(); // cod2 -> alvo
    const m2 = new Map();

    rows.forEach(r => {
      if (norm(r.cultura) === a1) m1.set(r.cod2, r.alvo);
      if (norm(r.cultura) === a2) m2.set(r.cod2, r.alvo);
    });

    const exclusivos1 = [];
    const exclusivos2 = [];
    const comuns      = [];

    for (const [cod2, alvo] of m1) {
      if (m2.has(cod2)) {
        comuns.push({ cod2, alvo1: alvo, alvo2: m2.get(cod2) });
      } else {
        exclusivos1.push({ cod2, alvo });
      }
    }
    for (const [cod2, alvo] of m2) {
      if (!m1.has(cod2)) exclusivos2.push({ cod2, alvo });
    }

    res.json({
      ok: true,
      cultura1, cultura2,
      total1: m1.size, total2: m2.size,
      exclusivos1, exclusivos2, comuns
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/verificar  { termo }  → busca produto por nome em resultadoPesquisa.asp
app.post('/api/verificar', async (req, res) => {
  try {
    const { termo } = req.body;
    if (!termo) return res.status(400).json({ ok: false, error: 'termo é obrigatório' });

    const html = await fetchPesquisa();
    const rows = parsePesquisaRows(html);

    const t = norm(termo);
    const filtered = rows.filter(r => norm(r.nome).includes(t));

    res.json({ ok: true, termo, total: filtered.length, rows: filtered });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🌱 Reag Celepar Scraper rodando em http://0.0.0.0:${PORT}\n`);
  console.log(`  📡 Acessível na rede em http://<seu-ip>:${PORT}\n`);
});
