const feedbackDb = require('./feedbackDb');

const STOPWORDS = new Set([
  'de','do','da','dos','das','e','o','a','os','as','em','no','na','nos','nas',
  'por','para','com','um','uma','uns','umas','que','se','ou','ao','aos',
  'seu','sua','seus','suas','este','esta','esse','essa','pelo','pela',
  'nao','mais','como','mas','ate','foi','ser','ter','sao','quando','para',
  'este','essa','aquele','aquela','dele','dela','isso','isto','aqui','ali',
]);

function tokenizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Analisa os textos das páginas confirmadas por campo e persiste keywords
 * que aparecem em pelo menos `minOcorrencias` fração dos documentos.
 * Retorna { campo: [keywords descobertas] }.
 */
function descobrir(minOcorrencias = 0.5) {
  const campos = feedbackDb.camposComFeedback();
  const resultado = {};

  for (const campo of campos) {
    const rows = feedbackDb.buscarFeedbackPorCampo(campo);
    if (rows.length < 2) continue;

    // Frequência de documento (cada palavra conta 1 vez por página)
    const freq = {};
    for (const { texto_pagina } of rows) {
      const palavras = new Set(tokenizar(texto_pagina));
      for (const p of palavras) freq[p] = (freq[p] || 0) + 1;
    }

    const threshold = Math.ceil(rows.length * minOcorrencias);
    const candidatos = Object.entries(freq)
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    resultado[campo] = candidatos;
    for (const kw of candidatos) feedbackDb.salvarKeyword(campo, kw, 'auto');
  }

  return resultado;
}

module.exports = { descobrir };
