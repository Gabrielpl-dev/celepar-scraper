const fs = require('fs');
const path = require('path');

const CMAP_DIR = path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/').replace(/\\/g, '/');
const FONT_DIR = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/');

let pdfjsLib;

// Usa pdfjs-dist direto (mesmo caminho que mapeador.js já usa com sucesso), em vez do
// pdf-to-png-converter — que resolve cMapUrl internamente e sempre relativo a process.cwd(),
// e em produção isso quebrou de forma inconsistente entre instalações ("Invalid factory url").
// Construindo o cMapUrl/standardFontDataUrl aqui como caminho absoluto (independente de cwd),
// não há mais estado global compartilhado — logo também não há mais race condition entre
// chamadas concorrentes, e o process.chdir() que existia antes deixa de ser necessário.
async function converterPaginas(pdfPath, pagesToProcess) {
  pdfjsLib ??= await import('pdfjs-dist/legacy/build/pdf.mjs');

  const buf = fs.readFileSync(pdfPath);
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buf),
    cMapUrl: 'file:///' + CMAP_DIR,
    cMapPacked: true,
    standardFontDataUrl: 'file:///' + FONT_DIR,
    verbosity: 0,
  }).promise;

  const numeros = pagesToProcess ?? Array.from({ length: doc.numPages }, (_, i) => i + 1);
  const paginas = [];

  try {
    for (const numero of numeros) {
      const page = await doc.getPage(numero);
      const viewport = page.getViewport({ scale: 1.5 });
      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);
      const { canvas, context } = doc.canvasFactory.create(width, height);
      try {
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        paginas.push({ pageNumber: numero, content: canvas.toBuffer('image/png') });
      } finally {
        page.cleanup();
        doc.canvasFactory.destroy({ canvas, context });
      }
    }
  } finally {
    await doc.loadingTask.destroy();
  }

  return paginas;
}

module.exports = { converterPaginas };
