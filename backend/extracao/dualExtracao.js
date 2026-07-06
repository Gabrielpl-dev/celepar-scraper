const { mapearPaginas } = require('./mapeador');
const { CASOS, pagesFor } = require('./casos');
const { confirmarNoTexto } = require('./confirmador');
const { norm } = require('./norm');
const cerebrasClient = require('../lib/cerebrasClient');
const lmstudioClient = require('../lib/lmstudioClient');

function valoresIguais(a, b) {
  return norm(a) === norm(b);
}

// true/false = bateu ou não bateu no texto; null = não aplicável (valor vazio ou "não
// especificado na bula" — não dá pra confirmar ausência de informação no texto).
function statusNoTexto(valor, pageTexts, pages) {
  return confirmarNoTexto(valor, pageTexts, pages).confirmado;
}

// Confiança em % baseada nos sinais disponíveis: concordância entre os dois providers é o sinal
// mais forte; quando só um responde (ou eles divergem), o desempate é se o valor aparece
// literalmente no texto da página — é o mesmo mecanismo que pega alucinações tipo "Homicida"
// em vez de "Herbicida", sem precisar de regra fixa tipo "confia mais no provider X".
function calcularConfianca({ cerebrasValor, lmstudioValor, pageTexts, pages }) {
  if (cerebrasValor !== null && lmstudioValor !== null) {
    if (valoresIguais(cerebrasValor, lmstudioValor)) return 95;

    const confCerebras = statusNoTexto(cerebrasValor, pageTexts, pages) === true;
    const confLmstudio = statusNoTexto(lmstudioValor, pageTexts, pages) === true;
    if (confCerebras !== confLmstudio) return 75; // um bateu, o outro não — desempate confiável
    return 35; // nenhum bateu, ou os dois bateram (ambíguo) — precisa revisão humana
  }

  const valor = cerebrasValor ?? lmstudioValor;
  const status = statusNoTexto(valor, pageTexts, pages);
  if (status === false) return 25; // só uma resposta e nem essa bate no texto
  return 70; // só uma resposta, mas bate no texto (ou é "não especificado", que é honesto)
}

// Roda um campo nos dois providers em paralelo e decide o valor final + confiança (0-100%).
// Quando divergem, ou quando só um provider responde, o desempate é sempre o texto da página —
// nunca uma preferência fixa por provider (isso quebraria no primeiro documento diferente).
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

  if (cerebrasValor === null && lmstudioValor === null) {
    valor = null;
    confianca = 0;
  } else if (cerebrasValor !== null && lmstudioValor !== null && !valoresIguais(cerebrasValor, lmstudioValor)) {
    const confCerebras = statusNoTexto(cerebrasValor, pageTexts, pages) === true;
    const confLmstudio = statusNoTexto(lmstudioValor, pageTexts, pages) === true;
    valor = confLmstudio && !confCerebras ? lmstudioValor : cerebrasValor;
    confianca = calcularConfianca({ cerebrasValor, lmstudioValor, pageTexts, pages });
  } else {
    valor = cerebrasValor ?? lmstudioValor;
    confianca = calcularConfianca({ cerebrasValor, lmstudioValor, pageTexts, pages });
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
