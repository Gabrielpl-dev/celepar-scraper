const { norm } = require('./norm');

/**
 * Busca o valor extraído nos textos das páginas usadas.
 * Retorna { confirmado: true, pagina } ou { confirmado: false }.
 */
function confirmarNoTexto(valor, pageTexts, pages) {
  const v = norm(valor);
  if (!v || v === norm('não especificado na bula')) return { confirmado: null };

  for (const pageNum of pages) {
    const text = pageTexts[pageNum - 1];
    if (!text) continue;
    if (norm(text).includes(v)) return { confirmado: true, pagina: pageNum };
  }
  return { confirmado: false };
}

module.exports = { confirmarNoTexto };
