require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const { mapearPaginas }               = require('./mapeador');
const { extrairNomesComerciais, extrairRegistroMA, extrairFabricante, extrairFormulacao, extrairConcentracao, extrairIngredienteInerte, extrairClasseDefensivo, extrairGrupoQuimico, extrairClassificacaoToxicologica, extrairPrincipioAtivo } = require('./campos_cadastro_produto');
const { callVision }          = require('../lib/lmstudioClient');
const { precisaEmitirTermo }  = require('./regras');

// Uso: node teste.js [nome-do-pdf]
const nomePdf = process.argv[2] || 'Bula-de-teste';
const PDF     = path.join(__dirname, 'bulas', nomePdf.endsWith('.pdf') ? nomePdf : nomePdf + '.pdf');

const GROUND_TRUTH_DB = {
  'Bula-de-teste': {
    nomeComercial:             'IMAZETAPIR 700 WG PERTERRA',
    registroMA:                '32024',
    fabricante:                'Perterra Insumos Agropecuários S.A.',
    formulacao:                'WG',
    concentracao:              '700 g/kg',
    classeDefensivo:           'Herbicida',
    grupoQuimico:              'Imidazolinonas',
    classificacaoToxicologica: 'Categoria 5',
    principioAtivo:            'Imazetapir',
  },
  'Bio-Green': {
    nomeComercial: 'BIO GREEN',
  },
  'F1023786651_MATENO PÓS_BULA_06.04.2026': {
    nomeComercial:             'MATENO',
    registroMA:                '12525',
    fabricante:                'Bayer S.A.',
    formulacao:                'OD',
    concentracao:              '150 g/L',
    ingredienteInerte:         '860 g/L',
    classeDefensivo:           'Herbicida',
    grupoQuimico:              'não especificado',
    classificacaoToxicologica: 'Categoria 4',
    principioAtivo:            'Diflufenican',
  },
};

const groundTruth = GROUND_TRUTH_DB[nomePdf] ?? {};

function norm(str) {
  return String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function passes(extracted, expected) {
  const e = norm(extracted), x = norm(expected);
  return e.includes(x) || x.includes(e);
}

function makeCall(pages) {
  return (prompt, opts) => callVision(prompt, PDF, { ...opts, pages });
}

function pagesFor(mapa, campo, fallback = [1]) {
  return mapa[campo] ?? fallback;
}

function trunc(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function pad(str, n) {
  return String(str).padEnd(n).slice(0, n);
}

function renderTabela(linhas) {
  const cols = [28, 8, 38, 10, 7, 7];
  const headers = ['Campo', 'Páginas', 'Extraído', 'Resultado', 'Termo', 'Tempo'];
  const sep = '┼' + cols.map(n => '─'.repeat(n + 2)).join('┼') + '┼';
  const top = '┌' + cols.map(n => '─'.repeat(n + 2)).join('┬') + '┐';
  const bot = '└' + cols.map(n => '─'.repeat(n + 2)).join('┴') + '┘';
  const row = cells => '│ ' + cells.map((c, i) => pad(c, cols[i])).join(' │ ') + ' │';

  console.log(top);
  console.log(row(headers));
  console.log('├' + sep.slice(1, -1) + '┤');
  for (const l of linhas) console.log(row(l));
  console.log(bot);
}

async function runTeste() {
  console.log(`\nPDF: ${path.basename(PDF)}`);
  process.stdout.write('Mapeando páginas... ');
  const { mapa, totalPaginas } = await mapearPaginas(PDF);
  console.log(`${totalPaginas} páginas\n`);

  const casos = [
    { nome: 'nomeComercial',             fn: extrairNomesComerciais,           campo: 'nomeComercial' },
    { nome: 'registroMA',                fn: extrairRegistroMA,                paginas: [1] },
    { nome: 'fabricante',               fn: extrairFabricante,                campo: 'fabricante' },
    { nome: 'formulacao',               fn: extrairFormulacao,                campo: 'concentracao' },
    { nome: 'concentracao',              fn: extrairConcentracao,              campo: 'concentracao' },
    { nome: 'ingredienteInerte',         fn: extrairIngredienteInerte,         campo: 'concentracao' },
    { nome: 'classeDefensivo',           fn: extrairClasseDefensivo,           paginas: [1] },
    { nome: 'grupoQuimico',              fn: extrairGrupoQuimico,              campo: 'concentracao' },
    { nome: 'classificacaoToxicologica', fn: extrairClassificacaoToxicologica, campo: 'classificacaoToxicologica' },
    { nome: 'principioAtivo',            fn: extrairPrincipioAtivo,            campo: 'concentracao' },
  ];

  const linhas = [];
  let pass = 0, fail = 0, sem_gt = 0;

  for (const { nome, fn, campo, paginas } of casos) {
    process.stdout.write(`  Extraindo ${nome}...`);
    const pages = paginas ?? pagesFor(mapa, campo);
    const call  = makeCall(pages);
    const t0    = Date.now();

    let extraido;
    try {
      const r = await fn(call);
      extraido = r.content.trim();
    } catch (err) {
      extraido = `ERRO: ${err.message}`;
      fail++;
      linhas.push([nome, JSON.stringify(pages), trunc(extraido, 38), '✗ ERRO', '', '']);
      console.log(' erro');
      continue;
    }

    const elapsed  = ((Date.now() - t0) / 1000).toFixed(1) + 's';
    const esperado = groundTruth[nome];
    let resultado;

    if (esperado !== undefined) {
      const ok = passes(extraido, esperado);
      if (ok) { pass++; resultado = '✓ PASS'; } else { fail++; resultado = '✗ FAIL'; }
    } else {
      sem_gt++;
      resultado = '? SEM GT';
    }

    const termo = nome === 'principioAtivo' ? (precisaEmitirTermo(extraido) ? '⚠ SIM' : '✗ NÃO') : '';
    linhas.push([nome, JSON.stringify(pages), trunc(extraido, 38), resultado, termo, elapsed]);
    console.log(` ${resultado}`);
  }

  console.log();
  renderTabela(linhas);
  console.log();
  if (pass + fail > 0) console.log(`PASS: ${pass}  FAIL: ${fail}  SEM GT: ${sem_gt}`);
  else                 console.log(`Sem ground truth — adicione valores em GROUND_TRUTH_DB para habilitar assertions`);
  console.log();
}

runTeste().catch(console.error);
