const fs = require('fs');
const path = require('path');

const SECOES = {
  nomeComercial:             ['nome do produto', 'nome comercial'],
  concentracao:              ['composição', 'ingrediente ativo', 'concentração'],
  classificacaoToxicologica: ['classificação toxicológica'],
  classificacaoAmbiental:    ['classificação ambiental', 'periculosidade ambiental'],
  orientacoesUso:            ['instruções de uso', 'modo de usar', 'orientações de uso', 'tabela de culturas', 'recomendações de uso'],
  epi:                       ['equipamento de proteção individual'],
  primeirosSocorros:         ['primeiros socorros'],
  restricoes:                ['restrições de uso', 'rotação de cultura', 'intervalo de segurança'],
  armazenamento:             ['armazenamento', 'transporte'],
  destinoFinal:              ['destino final', 'descarte'],
};

async function mapearPaginas(pdfPath) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const cmapDir = path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/').replace(/\\/g, '/');
  const fontDir  = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/');

  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buf),
    cMapUrl: 'file:///' + cmapDir,
    cMapPacked: true,
    standardFontDataUrl: 'file:///' + fontDir,
    verbosity: 0,
  }).promise;

  const pageTexts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ').toLowerCase();
    pageTexts.push(text);
    page.cleanup();
  }
  await doc.loadingTask.destroy();

  const mapa = {};
  for (const [campo, keywords] of Object.entries(SECOES)) {
    const paginas = [];
    pageTexts.forEach((text, idx) => {
      if (keywords.some(kw => text.includes(kw))) {
        paginas.push(idx + 1);
      }
    });
    mapa[campo] = paginas.length > 0 ? paginas : null;
  }

  return { mapa, totalPaginas: doc.numPages };
}

module.exports = { mapearPaginas };
