const { norm } = require('./norm');

const SYSTEM = 'Você é um sistema especializado em extração de dados de bulas de agrotóxicos brasileiros. Extraia apenas o que estiver explicitamente no texto. Se um dado não estiver presente, responda "não especificado na bula". Nunca invente informações.';

const opts = (extra = {}) => ({ systemPrompt: SYSTEM, ...extra });

const CLASSES_DEFENSIVO_VALIDAS = [
  'Herbicida', 'Fungicida', 'Inseticida', 'Acaricida', 'Nematicida',
  'Bactericida', 'Formicida', 'Cupinicida', 'Raticida', 'Molusquicida',
  'Regulador de Crescimento', 'Adjuvante', 'Fumigante', 'Antibrotante',
];

async function extrairNomesComerciais(call) {
  return call(
    'Extraia o(s) nome(s) comercial(is) do produto. Se houver mais de um, separe com ";". Retorne apenas os nomes, sem explicações.',
    opts({ maxTokens: 100 })
  );
}

async function extrairConcentracao(call) {
  return call(
    'Extraia a concentração do ingrediente ativo na formulação (ex: "700 g/kg", "240,00 g/L"). Retorne apenas o valor com a unidade, sem explicações.',
    opts({ maxTokens: 20 })
  );
}

async function extrairClassificacaoToxicologica(call) {
  return call(
    'Extraia a classificação toxicológica do produto (ex: "Categoria 5 – Produto Improvável de Causar Dano Agudo"). Retorne apenas a classificação, sem explicações.',
    opts({ maxTokens: 60 })
  );
}

async function extrairRegistroMA(call) {
  return call(
    'Extraia o número do registro do MAPA/MA do produto (ex: "32024", "BR 32024"). Retorne apenas o número, sem texto adicional.',
    opts({ maxTokens: 20 })
  );
}

async function extrairFabricante(call) {
  return call(
    'Extraia o nome do fabricante ou empresa registrante do produto. Procure pelo campo "TITULAR DO REGISTRO" na bula (ex: "Bayer S.A.", "Syngenta Proteção de Cultivos Ltda."). Retorne apenas o nome da empresa, sem explicações.',
    opts({ maxTokens: 60 })
  );
}

async function extrairFormulacao(call) {
  return call(
    'Extraia o tipo de formulação do produto (ex: "WG", "SC", "EC", "WP", "GR", "SL"). Retorne apenas a sigla ou nome da formulação, sem explicações.',
    opts({ maxTokens: 20 })
  );
}

async function extrairIngredienteInerte(call) {
  return call(
    'Extraia a concentração do ingrediente inerte na formulação (ex: "300 g/kg", "760 g/L"). Retorne apenas o valor com a unidade, sem explicações.',
    opts({ maxTokens: 20 })
  );
}

async function extrairClasseDefensivo(call, tentativas = 3) {
  let ultima;
  for (let i = 0; i < tentativas; i++) {
    ultima = await call(
      'Extraia a classe do defensivo agrícola em português brasileiro (ex: "Herbicida", "Fungicida", "Inseticida", "Acaricida", "Nematicida"). Retorne apenas a classe, sem explicações. Use sempre "Inseticida", nunca "Insecticida".',
      opts({ maxTokens: 20 })
    );
    const valida = CLASSES_DEFENSIVO_VALIDAS.some(c => norm(ultima.content).includes(norm(c)));
    if (valida) return ultima;
  }
  return ultima; // esgotou tentativas: retorna a última pra confirmação/feedback sinalizar divergência
}

async function extrairGrupoQuimico(call) {
  return call(
    'Extraia o grupo químico do ingrediente ativo (ex: "Imidazolinonas", "Glicinas", "Triazinas"). Retorne apenas o nome do grupo, sem explicações.',
    opts({ maxTokens: 30 })
  );
}

async function extrairGrupoMecanismoAcao(call) {
  return call(
    'A bula tem um quadro/selo destacado com 3 partes: a palavra "GRUPO", um código, e a classe do defensivo (ex: o quadro mostra "GRUPO | H | HERBICIDA", ou "GRUPO | 4 | INSETICIDA"). ' +
    'Extraia SOMENTE o código do meio, sem a palavra "GRUPO" e sem a classe. ' +
    'Exemplo: se o quadro mostra "GRUPO | H | HERBICIDA", a resposta correta é apenas "H" — não responda "GRUPO H HERBICIDA" nem inclua barras "|". ' +
    'O código nunca é só um número isolado: ou é uma letra sozinha (ex: "H", "O"), ou uma combinação de letra e número (ex: "4A"). ' +
    'Se houver mais de um código de grupo DIFERENTE (produto com mais de um princípio ativo de grupos distintos), separe com ";". ' +
    'Nunca repita o mesmo código duas vezes. Retorne apenas o(s) código(s), sem mais nada.',
    opts({ maxTokens: 10 })
  );
}

async function extrairPrincipioAtivo(call) {
  return call(
    'Extraia o(s) nome(s) do(s) princípio(s) ativo(s) do produto (apenas o nome, sem concentração). ' +
    'Se o nome do princípio ativo aparecer como uma fórmula química/IUPAC longa seguida do nome comum entre parênteses (ex: "Ammonium 4-[hydroxy(methyl)phosphinoyl]-DL-homoalaninate (GLUFOSINATO - SAL DE AMÔNIO)"), ' +
    'trate como um único princípio ativo e retorne apenas o nome comum entre parênteses, ignorando a fórmula IUPAC. ' +
    'Só separe com ";" quando houver de fato mais de um princípio ativo distinto na composição. Retorne apenas os nomes, sem explicações.',
    opts({ maxTokens: 80 })
  );
}

module.exports = { extrairNomesComerciais, extrairRegistroMA, extrairFabricante, extrairFormulacao, extrairConcentracao, extrairIngredienteInerte, extrairClasseDefensivo, extrairGrupoQuimico, extrairGrupoMecanismoAcao, extrairClassificacaoToxicologica, extrairPrincipioAtivo };
