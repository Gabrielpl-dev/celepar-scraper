const { mapearPaginas } = require('./mapeador');
const { CASOS, pagesFor } = require('./casos');
const { confirmarNoTexto } = require('./confirmador');
const { norm } = require('./norm');
const cerebrasClient = require('../lib/cerebrasClient');
const lmstudioClient = require('../lib/lmstudioClient');

function valoresIguais(a, b) {
  return norm(a) === norm(b);
}

function bateNoTexto(valor, pageTexts, pages) {
  return confirmarNoTexto(valor, pageTexts, pages).confirmado === true;
}

// Roda um campo nos dois providers em paralelo e decide o valor final:
// concordam -> confiança alta; divergem -> desempata pelo que bate no texto da página;
// nenhum bate (ou os dois batem) -> confiança 'revisar', expõe os dois valores brutos.
async function extrairCampo({ nome, fn, campo, paginas }, pdfPath, mapa, pageTexts) {
  const pages = paginas ?? pagesFor(mapa, campo);
  const chamar = client => (prompt, opts) => client.callVision(prompt, pdfPath, { ...opts, pages });

  const [cerebrasRes, lmstudioRes] = await Promise.allSettled([
    fn(chamar(cerebrasClient)),
    fn(chamar(lmstudioClient)),
  ]);

  const cerebrasValor = cerebrasRes.status === 'fulfilled' ? cerebrasRes.value.content.trim() : null;
  const lmstudioValor = lmstudioRes.status === 'fulfilled' ? lmstudioRes.value.content.trim() : null;
  const cerebrasErro  = cerebrasRes.status === 'rejected' ? cerebrasRes.reason.message : null;
  const lmstudioErro  = lmstudioRes.status === 'rejected' ? lmstudioRes.reason.message : null;
  const cerebrasStack = cerebrasRes.status === 'rejected' ? cerebrasRes.reason.stack : null;
  const lmstudioStack = lmstudioRes.status === 'rejected' ? lmstudioRes.reason.stack : null;

  let valor, confianca;

  if (cerebrasValor !== null && lmstudioValor !== null) {
    if (valoresIguais(cerebrasValor, lmstudioValor)) {
      valor = cerebrasValor;
      confianca = 'alta';
    } else {
      const confCerebras = bateNoTexto(cerebrasValor, pageTexts, pages);
      const confLmstudio = bateNoTexto(lmstudioValor, pageTexts, pages);
      if (confCerebras && !confLmstudio)      { valor = cerebrasValor; confianca = 'alta'; }
      else if (confLmstudio && !confCerebras) { valor = lmstudioValor; confianca = 'alta'; }
      else                                    { valor = cerebrasValor; confianca = 'revisar'; }
    }
  } else if (cerebrasValor !== null) {
    valor = cerebrasValor; confianca = 'alta';
  } else if (lmstudioValor !== null) {
    valor = lmstudioValor; confianca = 'alta';
  } else {
    valor = null; confianca = 'erro';
  }

  return {
    campo: nome,
    valor,
    confianca,
    paginas: pages,
    cerebras: cerebrasValor ?? `ERRO: ${cerebrasErro}`,
    lmstudio: lmstudioValor ?? `ERRO: ${lmstudioErro}`,
    cerebrasStack: cerebrasStack ?? undefined,
    lmstudioStack: lmstudioStack ?? undefined,
  };
}

// Async generator: emite um evento por campo pronto, pra alimentar SSE sem acumular tudo em memória.
async function* rodarExtracaoDual(pdfPath) {
  const { mapa, pageTexts, totalPaginas } = await mapearPaginas(pdfPath);
  yield { tipo: 'inicio', totalPaginas, campos: CASOS.map(c => c.nome) };

  for (const caso of CASOS) {
    const resultado = await extrairCampo(caso, pdfPath, mapa, pageTexts);
    yield { tipo: 'campo', ...resultado };
  }

  yield { tipo: 'fim' };
}

module.exports = { rodarExtracaoDual };
