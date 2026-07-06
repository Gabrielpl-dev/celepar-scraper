// Harness genérico de extração: repete a chamada até o resultado passar no validador,
// ou esgotar as tentativas (retorna a última mesmo assim, pra confirmação/feedback sinalizar).
async function extrairComValidacao(callFn, validador, tentativas = 3) {
  let resultado;
  for (let i = 0; i < tentativas; i++) {
    resultado = await callFn();
    if (validador(resultado.content)) return resultado;
  }
  return resultado;
}

module.exports = { extrairComValidacao };
