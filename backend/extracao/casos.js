const campos = require('./campos_cadastro_produto');

const CASOS = [
  { nome: 'nomeComercial',             fn: campos.extrairNomesComerciais,           campo: 'nomeComercial' },
  { nome: 'registroMA',                fn: campos.extrairRegistroMA,                paginas: [1] },
  { nome: 'fabricante',                fn: campos.extrairFabricante,                campo: 'fabricante' },
  { nome: 'formulacao',                fn: campos.extrairFormulacao,                campo: 'formulacao' },
  { nome: 'concentracao',              fn: campos.extrairConcentracao,              campo: 'concentracao' },
  { nome: 'ingredienteInerte',         fn: campos.extrairIngredienteInerte,         campo: 'ingredienteInerte' },
  { nome: 'classeDefensivo',           fn: campos.extrairClasseDefensivo,           paginas: [1] },
  { nome: 'grupoQuimico',              fn: campos.extrairGrupoQuimico,              campo: 'grupoQuimico' },
  { nome: 'grupoMecanismoAcao',        fn: campos.extrairGrupoMecanismoAcao,        paginas: [1] },
  { nome: 'classificacaoToxicologica', fn: campos.extrairClassificacaoToxicologica, campo: 'classificacaoToxicologica' },
  { nome: 'principioAtivo',            fn: campos.extrairPrincipioAtivo,            campo: 'concentracao' },
];

function pagesFor(mapa, campo, fallback = [1]) {
  return mapa[campo] ?? fallback;
}

module.exports = { CASOS, pagesFor };
