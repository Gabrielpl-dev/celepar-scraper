const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');

const BACKEND_DIR = path.join(__dirname, '..');

// pdf-to-png-converter resolve cMapUrl/standardFontDataUrl internamente, sempre relativo a
// process.cwd() (não aceita override via opções — cMapUrl/standardFontDataUrl passados são
// ignorados, ver node_modules/pdf-to-png-converter/out/propsToPdfDocInitParams.js). Por isso
// o chdir pro diretório do backend antes de chamar.
//
// process.cwd() é estado global do processo, então chamadas concorrentes (dualExtracao.js roda
// os dois providers em paralelo) não podem chdir ao mesmo tempo — uma restaura o cwd enquanto a
// outra ainda está resolvendo o caminho, gerando um caminho errado de forma intermitente. Por
// isso serializamos aqui numa fila: só uma conversão de PDF roda por vez no processo inteiro,
// mas a parte lenta (chamada de rede aos providers) continua acontecendo em paralelo, já que
// roda depois que essa função já retornou.
let filaAtual = Promise.resolve();

function converterPaginas(pdfPath, pagesToProcess) {
  const tarefa = filaAtual.then(() => executarConversao(pdfPath, pagesToProcess));
  filaAtual = tarefa.catch(() => {});
  return tarefa;
}

async function executarConversao(pdfPath, pagesToProcess) {
  const origCwd = process.cwd();
  process.chdir(BACKEND_DIR);
  try {
    const opts = { verbosityLevel: 0, viewportScale: 1.5, cMapPacked: true };
    if (pagesToProcess) opts.pagesToProcess = pagesToProcess;
    return await pdfToPng(pdfPath, opts);
  } finally {
    process.chdir(origCwd);
  }
}

module.exports = { converterPaginas };
