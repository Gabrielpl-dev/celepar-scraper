// Ingredientes ativos que exigem emissão de termo (auxínicos/mimetizadores de auxina)
const INGREDIENTES_TERMO = [
  '2,4-d',
  'dicamba',
  'picloram',
  'fluroxipir',
  'quincloraque',
  'triclopir',
  'aminopiralide',
  'halauxifen',
];

const { norm } = require('./norm');

// Verifica se o princípio ativo (string, pode ter vários separados por ";") exige termo
function precisaEmitirTermo(principioAtivo) {
  const nomes = norm(principioAtivo).split(';').map(s => s.trim());
  return nomes.some(nome => INGREDIENTES_TERMO.some(ing => nome.includes(ing)));
}

module.exports = { precisaEmitirTermo, INGREDIENTES_TERMO };
