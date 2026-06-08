const cheerio = require('cheerio');

const BASE_URL     = 'https://celepar07web.pr.gov.br/agrotoxicos/listar.asp';
const LINKEA_BASE  = 'https://celepar07web.pr.gov.br/agrotoxicos/';
const PESQUISA_URL = 'https://celepar07web.pr.gov.br/agrotoxicos/resultadoPesquisa.asp';
const PESQUISA_KEY = '__pesquisa__';
const PESQUISA_BODY = new URLSearchParams({
  criterioAgrotoxico: '', criterioIngredienteAtivo: '', criterioRegistrante: '',
  criterioClassificacaoToxicologica: '', criterioPraga: '', criterioSituacao: '',
  criterioClasse: '', criterioCulturaInfestada: '', criterioExpurgo: '',
  criterioAplicacaoAerea: '', criterioTratamentoSementes: '',
  select11: 'null', select1: '', select5: 'null', select4: 'null',
  select9: 'null', select6: 'null', select3: 'null', select7: 'null',
  descIngrediente: '', numeroRegistro: '', ClassificacaoQuiBio: '',
  submit1: 'Pesquisar'
}).toString();

const cache     = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const norm = s => String(s || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .trim()
  .toLowerCase();

function buildUrl(params) {
  const defaults = {
    Cod: '', descIngrediente: '',
    CodIngredienteAtivo: 'null', CodFormulacao: 'null', IdRegistrante: 'null',
    CodFormaAcao: 'null', CodAlvo: 'null', CodGrupoQuimico: 'null',
    CodClassToxicologica: 'null', CodSituacao: 'null', CodClassificacao: 'null',
    CodEspecie: 'null', CodAgrotoxico: 'null', NumeroRegistro: 'null',
    expurgo: 'null', aplica: 'null', tratam: 'null', ClassificacaoQuiBio: 'null',
    criterioAgrotoxico: '', criterioIngredienteAtivo: '', criterioRegistrante: '',
    criterioClassificacaoToxicologica: '', criterioPraga: '', criterioSituacao: '',
    criterioClasse: '', criterioCulturaInfestada: '', criterioExpurgo: '',
    criterioAplicacaoAerea: '', criterioTratamentoSementes: ''
  };
  const qs = Object.entries({ ...defaults, ...params })
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
    .join('&');
  return `${BASE_URL}?${qs}`;
}

async function fetchPage(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.html;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  let html;
  try { html = new TextDecoder('windows-1252').decode(buf); }
  catch { html = buf.toString('latin1'); }
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

function parseRows(html) {
  const $ = cheerio.load(html);
  const linhas = [];
  $('tr').each((_, tr) => {
    const $tr  = $(tr);
    const $tds = $tr.children('td');
    if ($tds.length < 4) return;
    const $a = $tds.eq(0).find('a').first();
    if (!$a.length) return;
    const m = ($a.attr('onclick') || '').match(/Cod2=(\d+)/);
    if (!m) return;
    const produtos = [];
    $tr.find('font').each((__, f) => {
      const $f = $(f);
      const txt = $f.text().trim();
      const cor = $f.attr('color') || null;
      if (txt) produtos.push({ nome: txt, cor });
    });
    const $linkeaA  = $tr.find('a').filter((_, a) => ($(a).attr('onclick') || '').includes('linkea.asp')).first()
    const linkeaOnclick = $linkeaA.attr('onclick') || ''
    const linkeaMatch   = linkeaOnclick.match(/['"]([^'"]*linkea\.asp[^'"]*)['"]/)
    const linkeaUrl     = linkeaMatch ? LINKEA_BASE + linkeaMatch[1] : null

    linhas.push({
      cultura: $a.text().trim(),
      siagro:  m[1],
      alvo:    $tds.eq(2).text().trim(),
      linkeaUrl,
      rawText: $tr.text().replace(/\s+/g, ' ').trim(),
      produtos
    });
  });
  return linhas;
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
    const codMatch = (linkEl.attr('href') || '').match(/[?&]Cod=(\d+)/);
    const colorFont = $(tds[1]).find('font[color]').first();
    const situacao = colorFont.length ? colorFont.text().trim() : $(tds[1]).text().trim();
    const cor      = colorFont.length ? colorFont.attr('color').toLowerCase() : null;
    rows.push({
      nome,
      cod: codMatch ? codMatch[1] : null,
      situacao, cor,
      classificacao: $(tds[2]).text().trim(),
      empresa:       $(tds[3]).text().trim()
    });
  });
  return rows;
}

function validateListarStructure($, rows) {
  const warnings = [];
  const hasTrs = $('tr').filter((_, tr) => $(tr).children('td').length >= 4).length > 0;
  if (hasTrs && rows.length === 0)
    warnings.push('parseRows: encontrou <tr> com 4+ tds mas nenhum Cod2 extraído — padrão onclick pode ter mudado');
  if (rows.length > 0 && rows.every(r => r.produtos.length === 0))
    warnings.push('parseRows: nenhuma tag <font> encontrada — status dos produtos pode estar ausente');
  return warnings;
}

function validatePesquisaStructure($, rows) {
  const warnings = [];
  if ($('table#tb1').length === 0)
    warnings.push('parsePesquisa: table#tb1 não encontrada — ID da tabela pode ter mudado');
  else if ($('table#tb1 tr').length > 1 && rows.length === 0)
    warnings.push('parsePesquisa: tabela encontrada mas nenhuma linha extraída — estrutura interna pode ter mudado');
  return warnings;
}

function parseLinkeaPage(html) {
  const $ = cheerio.load(html)
  const result = {}
  $('td').each((_, td) => {
    const $font = $(td).find('font').first()
    if (!$font.length) return
    const label = $font.find('b').text().trim()
    const value = $font.contents().filter((_, n) => n.nodeType === 3).text().trim()
    if (label === 'Nome Comum do Alvo Biológico:')     result.nomeComumAlvo     = value
    if (label === 'Nome Científico do Alvo Biológico:') result.nomeCientificoAlvo = value
  })
  return result
}

async function enrichLinkeaRows(rows) {
  const uniqueUrls = [...new Set(rows.map(r => r.linkeaUrl).filter(Boolean))]
  const detailsMap = {}
  await Promise.all(uniqueUrls.map(async url => {
    try {
      const html = await fetchPage(url)
      detailsMap[url] = parseLinkeaPage(html)
    } catch {
      detailsMap[url] = {}
    }
  }))
  return rows.map(r => ({ ...r, ...(r.linkeaUrl ? detailsMap[r.linkeaUrl] : {}) }))
}

module.exports = {
  norm, buildUrl,
  fetchPage, fetchPesquisa,
  parseRows, parsePesquisaRows,
  parseLinkeaPage, enrichLinkeaRows,
  validateListarStructure, validatePesquisaStructure,
};
