const SYSTEM = 'Você é um sistema especializado em extração de dados de bulas de agrotóxicos brasileiros. Extraia apenas o que estiver explicitamente no texto. Se um dado não estiver presente, responda "não especificado na bula". Nunca invente informações.';

const opts = (extra = {}) => ({ systemPrompt: SYSTEM, ...extra });

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
    'Extraia o nome do fabricante ou empresa registrante do produto (ex: "Bayer S.A.", "Syngenta Proteção de Cultivos Ltda."). Retorne apenas o nome da empresa, sem explicações.',
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

async function extrairClasseDefensivo(call) {
  return call(
    'Extraia a classe do defensivo agrícola (ex: "Herbicida", "Fungicida", "Inseticida", "Acaricida", "Nematicida"). Retorne apenas a classe, sem explicações.',
    opts({ maxTokens: 20 })
  );
}

async function extrairGrupoQuimico(call) {
  return call(
    'Extraia o grupo químico do ingrediente ativo (ex: "Imidazolinonas", "Glicinas", "Triazinas"). Retorne apenas o nome do grupo, sem explicações.',
    opts({ maxTokens: 30 })
  );
}

async function extrairPrincipioAtivo(call) {
  return call(
    'Extraia o(s) nome(s) do(s) princípio(s) ativo(s) do produto (apenas o nome, sem concentração). Se houver mais de um, separe com ";". Retorne apenas os nomes, sem explicações.',
    opts({ maxTokens: 80 })
  );
}

module.exports = { extrairNomesComerciais, extrairRegistroMA, extrairFabricante, extrairFormulacao, extrairConcentracao, extrairIngredienteInerte, extrairClasseDefensivo, extrairGrupoQuimico, extrairClassificacaoToxicologica, extrairPrincipioAtivo };
