const { createBoundedCache } = require('./boundedCache')
const { normMa } = require('./normalizer')

const BASE     = 'https://sigen.cidasc.sc.gov.br'
const MAIN_URL = `${BASE}/consultaagrotoxicocadastropublico/consultaagx`
const UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const CULTURAS_CACHE_KEY = '__culturas__'
const culturasCache      = createBoundedCache({ ttlMs: 24 * 60 * 60 * 1000, maxEntries: 1 })

let _session = null

async function openSession() {
  const res     = await fetch(MAIN_URL, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  const cookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') || '').split(/,(?=[^ ])/).map(s => s.trim())
  _session = cookies.map(c => c.split(';')[0].trim()).join('; ')
}

async function sigenPost(urlPath, body, retried = false) {
  if (!_session) await openSession()
  const res = await fetch(`${BASE}${urlPath}`, {
    method:  'POST',
    headers: {
      'User-Agent':   UA,
      Referer:        MAIN_URL,
      Accept:         'application/json, text/javascript, */*',
      ...(_session ? { Cookie: _session } : {}),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    if (retried) throw new Error(`SIGEN ${urlPath} retornou HTML (sessão inválida)`)
    _session = null
    return sigenPost(urlPath, body, true)
  }
  return res.json()
}

// Filtros aceitos por CarregarConsultaAgrotoxico — todos coded (esperam código
// numérico da tabela de referência, não texto livre), exceto nrRegistro/nmMarcaComercial.
// Ver docs/sigen.md: só nrRegistro sozinho responde rápido, qualquer outro filtro
// (incluindo cdNmComumEspecieVegetal = cultura) estoura timeout de SQL no servidor.
function buscaBody(overrides) {
  return {
    nrRegistro: '', nmMarcaComercial: '',
    csTipoRegistro: '', idRegistroEmpresa: '', nrDocumento: '',
    cdClasses: '', csSituacao: '', csClassificacaoToxicologica: '',
    csNovaClassificacaoToxicologica: '', csClassificacaoAmbiental: '',
    cdFormulacao: '', cdFormaAcao: '', cdModalidade: '', cdIngredienteAtivo: '',
    cdNmComumEspecieVegetal: '', cdNmComumPraga: '', cdGrupoQuimico: '',
    flInflamavel: '', flCorrosivo: '', flMinorCrops: '', flOrganico: '',
    ...overrides,
  }
}

// SIGEN faz match exato de nrRegistro — "01323" não acha nada, só "1323" (sem zero à
// esquerda) acha. A Agrofit (fonte usada pra resolver nome->MA) devolve com zero à
// esquerda, então sem isso todo produto com MA < 10000 dava falso-negativo no SIGEN.
// Retorna { encontrado: boolean, nome?: string }
async function verificarMA(ma) {
  const data = await sigenPost(
    '/ConsultaAgrotoxicoCadastroPublico/CarregarConsultaAgrotoxico',
    buscaBody({ nrRegistro: normMa(ma) })
  )
  if (!data.success || !data.data?.length) return { encontrado: false }
  return { encontrado: true, nome: (data.data[0].nmMarcaComercial || '').trim() }
}

// Detalhe completo de um produto por MA: dados básicos (da busca) + culturas,
// ingredientes ativos, classe/forma de ação e documentos (do detalhe). Ver docs/sigen.md.
async function buscarDetalhe(ma) {
  const searchData = await sigenPost(
    '/ConsultaAgrotoxicoCadastroPublico/CarregarConsultaAgrotoxico',
    buscaBody({ nrRegistro: normMa(ma) })
  )
  if (!searchData.success || !searchData.data?.length) return null

  const produto = searchData.data[0]
  const id      = produto.idAgrotoxicoCadastro
  const nome    = (produto.nmMarcaComercial || '').trim()

  const detailData = await sigenPost(
    '/ConsultaAgrotoxicoCadastroPublico/CarregarAgrotoxicoCadastro',
    { idAgrotoxicoCadastro: String(id) }
  )
  if (!detailData.success) throw new Error('SIGEN retornou erro no detalhe')
  const d = detailData.data

  const culturas = (d.listaCulturaAlvo?.Current ?? []).map(c => ({
    cdCultura:       c.cdNomeComumEspecieVegetal,
    cultura:         c.nmComumEspecieVegetal,
    pragaCientifico: c.nmCientificoPraga,
    observacao:      c.dsObservacao || null,
  }))

  const ingredientesAtivos = (d.listaIngredienteAtivo?.Current ?? []).map(i => ({
    codigo:       i.cdIngredienteAtivo,
    nomeComum:    i.nmComum,
    nomeQuimico:  i.nmQuimico,
    concentracao: i.nrConcentracao,
    unidade:      (i.unidadeDerivada?.sgGrandeza || '').trim(),
    grupoQuimico: i.nmGrupoQuimico || null,
  }))

  const documentos = []
  if (d.cdRepositorioArquivoFichaEmergencia > 0) {
    documentos.push({
      tipo:        'Ficha de Emergência',
      nomeArquivo: `${nome} - Ficha de Emergência`,
      url:         `/api/sigen-pdf?id=${d.cdRepositorioArquivoFichaEmergencia}`,
      fonte:       'SIGEN',
    })
  }
  if (d.cdRepositorioArquivoBula > 0) {
    documentos.push({
      tipo:        'Bula',
      nomeArquivo: `${nome} - Bula`,
      url:         `/api/sigen-pdf?id=${d.cdRepositorioArquivoBula}`,
      fonte:       'SIGEN',
    })
  }

  return {
    ma, nome,
    id:                        String(id),
    situacao:                  produto.dsSituacao || null,
    classificacaoToxicologica: produto.dsClassificacaoToxicologica || null,
    classificacaoAmbiental:    produto.dsClassificacaoAmbiental || null,
    formulacao:                produto.nmFormulacao || null,
    validade:                  produto.dhValidade || null,
    empresa:                   produto.nmPessoa || null,
    classes:                   d.classes || null,
    formaAcao:                 d.formaAcao || null,
    culturas,
    ingredientesAtivos,
    documentos,
  }
}

// Tabela mestra de cultura (nome comum espécie vegetal), ~526 registros. O backend
// ignora os filtros que a UI manda (nome/codigo) e sempre devolve a lista inteira — ver
// docs/sigen.md. Muda pouco, cacheada por 24h.
async function listarCulturas() {
  const cached = culturasCache.get(CULTURAS_CACHE_KEY)
  if (cached) return cached
  const data = await sigenPost('/DSV.Tabelas/NomeComumEspecieVegetal/PerformSearch', {})
  if (!data.success) throw new Error('SIGEN retornou erro ao listar culturas')
  const culturas = data.data.map(c => ({
    codigo: c.id_nome_comum_especie_vegetal,
    nome:   c.nm_comum_especie_vegetal,
  }))
  culturasCache.set(CULTURAS_CACHE_KEY, culturas)
  return culturas
}

module.exports = {
  sigenPost, openSession, verificarMA, buscarDetalhe, listarCulturas,
  get session() { return _session }, set session(v) { _session = v },
}
