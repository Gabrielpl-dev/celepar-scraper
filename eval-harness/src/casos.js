// Bateria de casos reais, só leitura -- cobre os endpoints mexidos na leva recente
// (desacoplamento de banco.js, SIGEN, estaduais). MAs escolhidos por já aparecerem
// documentados no próprio código/histórico do projeto como produtos reais existentes
// (não são inventados, então a resposta de hoje serve de gabarito confiável).
export const CASOS = [
  { nome: 'buscar-produto_zapp',    metodo: 'GET',  caminho: '/api/buscar-produto?nome=' + encodeURIComponent('Zapp QI 620') },
  { nome: 'buscar-produto_roundup', metodo: 'GET',  caminho: '/api/buscar-produto?nome=' + encodeURIComponent('Roundup') },
  { nome: 'verificar-produto_zapp', metodo: 'GET',  caminho: '/api/verificar-produto?nome=' + encodeURIComponent('Zapp QI 620') + '&ma=12908' },
  { nome: 'sigen_ma6715',           metodo: 'GET',  caminho: '/api/sigen?ma=6715' },
  { nome: 'sigen_culturas',         metodo: 'GET',  caminho: '/api/sigen-culturas' },
  { nome: 'estaduais_ma6715',       metodo: 'GET',  caminho: '/api/estaduais?ma=6715' },
  { nome: 'estaduais_ma12525',      metodo: 'GET',  caminho: '/api/estaduais?ma=12525' },
  { nome: 'cccb_ma9525',            metodo: 'POST', caminho: '/api/cccb', body: { params: { ma: '9525' } } },
  { nome: 'cccb_ma12908',           metodo: 'POST', caminho: '/api/cccb', body: { params: { ma: '12908' } } },
  // Cobre o matching de "ALGODÃO O.G.M" (banco) -> "Algodão Geneticamente Modificado" (Celepar)
  { nome: 'cccb_ma41818',           metodo: 'POST', caminho: '/api/cccb', body: { params: { ma: '41818' } } },
]
