const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');

const BACKEND_DIR = path.join(__dirname, '..');
const CMAP_DIR = path.join(__dirname, '../node_modules/pdfjs-dist/cmaps/').replace(/\\/g, '/');
const FONT_DIR = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/').replace(/\\/g, '/');

// pdf-to-png-converter, sem cMapUrl explícito, cai no default interno da lib — que monta um
// caminho com barra invertida e sem "file://", e quebra em produção ("Invalid factory url").
// Usa sempre o mesmo cMapUrl/standardFontDataUrl já validado em mapeador.js.
async function converterPaginas(pdfPath, pagesToProcess) {
  const origCwd = process.cwd();
  process.chdir(BACKEND_DIR);
  try {
    const opts = {
      verbosityLevel: 0,
      viewportScale: 1.5,
      cMapPacked: true,
      cMapUrl: 'file:///' + CMAP_DIR,
      standardFontDataUrl: 'file:///' + FONT_DIR,
    };
    if (pagesToProcess) opts.pagesToProcess = pagesToProcess;
    return await pdfToPng(pdfPath, opts);
  } finally {
    process.chdir(origCwd);
  }
}

module.exports = { converterPaginas };
