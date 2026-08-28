import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { request } from './apiClient.js'

const server = new McpServer({ name: 'celepar-scraper', version: '0.1.0' })

function respond(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data }
}

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
const write    = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }

server.registerTool(
  'buscar_produto',
  {
    title: 'Buscar produto',
    description: 'Busca um produto agrotóxico por nome, mesclando resultados do Celepar/Adapar e da Agrofit/Embrapa (CSV + API). Primeiro passo típico do fluxo: descobrir o MA (registro federal) e/ou Cod (Adapar) de um produto a partir do nome comercial.',
    inputSchema: z.object({ nome: z.string().describe('Nome (ou parte do nome) do produto comercial') }),
    annotations: readOnly,
  },
  async ({ nome }) => respond(await request('GET', '/api/buscar-produto', { query: { nome } }))
)

server.registerTool(
  'verificar_produto',
  {
    title: 'Verificar produto em todas as fontes',
    description: 'Verifica em quais fontes um produto existe: banco Oracle institucional, Adapar/Celepar, Agrofit e SIGEN (SC). Use depois de buscar_produto pra confirmar presença cruzada — informar ma/cod (se já conhecidos) evita nova busca por nome.',
    inputSchema: z.object({
      nome: z.string().describe('Nome do produto comercial'),
      ma:   z.string().optional().describe('Número de registro MA/Federal, se já conhecido'),
      cod:  z.string().optional().describe('Código Adapar (Cod), se já conhecido'),
    }),
    annotations: readOnly,
  },
  async ({ nome, ma, cod }) => respond(await request('GET', '/api/verificar-produto', { query: { nome, ma, cod } }))
)

server.registerTool(
  'agrofit_docs',
  {
    title: 'Documentos da Agrofit',
    description: 'Lista os documentos (bulas, rótulos, laudos) de um produto na Agrofit/Embrapa, dado o MA (registro) ou o Cod Adapar (resolvido via mapeamento local quando o MA não é informado direto). Pelo menos um dos dois é obrigatório.',
    inputSchema: z.object({
      ma:  z.string().optional().describe('Número de registro MA/Federal'),
      cod: z.string().optional().describe('Código Adapar (Cod) — usado pra resolver o MA se este não for informado'),
    }),
    annotations: readOnly,
  },
  async ({ ma, cod }) => {
    if (!ma && !cod) throw new Error('informe ma ou cod')
    return respond(await request('GET', '/api/agrofit-docs', { query: { ma, cod } }))
  }
)

server.registerTool(
  'sigen_consultar',
  {
    title: 'Consultar produto no SIGEN',
    description: 'Consulta um produto no SIGEN (cadastro público de agrotóxicos de Santa Catarina) pelo MA (registro federal).',
    inputSchema: z.object({ ma: z.string().describe('Número de registro MA/Federal') }),
    annotations: readOnly,
  },
  async ({ ma }) => respond(await request('GET', '/api/sigen', { query: { ma } }))
)

server.registerTool(
  'sigen_culturas',
  {
    title: 'Listar culturas do SIGEN',
    description: 'Lista a tabela mestra de culturas do SIGEN (~526 registros) — útil pra resolver nomes de cultura ao consultar o SIGEN.',
    inputSchema: z.object({}),
    annotations: readOnly,
  },
  async () => respond(await request('GET', '/api/sigen-culturas'))
)

server.registerTool(
  'cccb_culturas',
  {
    title: 'Listar culturas sincronizadas',
    description: 'Lista as culturas sincronizadas localmente do Oracle (tabela CULTURA), com o nome equivalente usado no Celepar quando já mapeado. Use pra descobrir o culturaid antes de chamar cccb_comparar.',
    inputSchema: z.object({}),
    annotations: readOnly,
  },
  async () => respond(await request('GET', '/api/cccb/culturas'))
)

server.registerTool(
  'cccb_comparar',
  {
    title: 'Comparar cadastro Oracle x Celepar (CCCB)',
    description: 'Compara o cadastro de um produto (por MA) entre o Oracle institucional e o Celepar/Adapar: aponta o que está correto, errado, faltando ou bloqueado por cultura/diagnóstico. É o núcleo do processo de verificação cruzada. Sem culturaid, compara todas as culturas do produto de uma vez.',
    inputSchema: z.object({
      ma:            z.string().describe('Número de registro MA/Federal do produto'),
      culturaid:     z.number().int().optional().describe('ID da cultura (de cccb_culturas) pra restringir a comparação a uma única cultura'),
      enrichLinkea:  z.boolean().optional().describe('Enriquece as linhas do Celepar com dados extras do Linkea (mais lento)'),
    }),
    annotations: readOnly,
  },
  async ({ ma, culturaid, enrichLinkea }) =>
    respond(await request('POST', '/api/cccb', { body: { culturaid, params: { ma }, enrichLinkea: !!enrichLinkea } }))
)

server.registerTool(
  'extrair_cultura',
  {
    title: 'Extrair linhas de uma cultura no Celepar',
    description: 'Extrai do Celepar as linhas (cultura/alvo) de uma cultura específica, opcionalmente filtrando por Cod (produto Adapar).',
    inputSchema: z.object({
      cultura: z.string().describe('Nome da cultura a extrair'),
      cod:     z.string().optional().describe('Código Adapar (Cod) pra restringir a um produto específico'),
    }),
    annotations: readOnly,
  },
  async ({ cultura, cod }) => respond(await request('POST', '/api/extrair-cultura', { body: { cultura, params: { Cod: cod } } }))
)

server.registerTool(
  'comparar_culturas',
  {
    title: 'Comparar alvos entre duas culturas',
    description: 'Compara os alvos (pragas/doenças) de duas culturas no Celepar, mostrando o que é exclusivo de cada uma e o que é comum às duas.',
    inputSchema: z.object({
      cultura1: z.string().describe('Nome da primeira cultura'),
      cultura2: z.string().describe('Nome da segunda cultura'),
      cod:      z.string().optional().describe('Código Adapar (Cod) pra restringir a um produto específico'),
    }),
    annotations: readOnly,
  },
  async ({ cultura1, cultura2, cod }) =>
    respond(await request('POST', '/api/comparar', { body: { cultura1, cultura2, params: { Cod: cod } } }))
)

server.registerTool(
  'verificar_celepar',
  {
    title: 'Buscar produtos no catálogo Celepar',
    description: 'Busca produtos no catálogo completo do Celepar (resultadoPesquisa) por termo no nome. Diferente de verificar_produto, que cruza múltiplas fontes — esta é só a base Celepar/Adapar.',
    inputSchema: z.object({ termo: z.string().describe('Termo de busca no nome do produto') }),
    annotations: readOnly,
  },
  async ({ termo }) => respond(await request('POST', '/api/verificar', { body: { termo } }))
)

server.registerTool(
  'listar_celepar',
  {
    title: 'Listar cadastro cru do Celepar',
    description: 'Lista o cadastro cru do Celepar (listar.asp) filtrando por Cod (produto Adapar) e/ou descIngrediente (ingrediente ativo). Retorna todas as linhas cultura/alvo do produto.',
    inputSchema: z.object({
      cod:             z.string().optional().describe('Código Adapar (Cod)'),
      descIngrediente: z.string().optional().describe('Nome do ingrediente ativo'),
    }),
    annotations: readOnly,
  },
  async ({ cod, descIngrediente }) =>
    respond(await request('GET', '/api/listar', { query: { Cod: cod, descIngrediente } }))
)

server.registerTool(
  'buscar_siagro',
  {
    title: 'Buscar produto por código SIAGRO',
    description: 'Busca no Celepar as culturas cadastradas pra um código SIAGRO específico. Usado quando o ponto de partida é o SIAGRO (não o nome do produto).',
    inputSchema: z.object({
      siagro: z.string().describe('Código SIAGRO a buscar'),
      cod:    z.string().optional().describe('Código Adapar (Cod) pra restringir a um produto específico'),
    }),
    annotations: readOnly,
  },
  async ({ siagro, cod }) => respond(await request('POST', '/api/buscar-siagro', { body: { siagro, params: { Cod: cod } } }))
)

server.registerTool(
  'agrofit_link_cod',
  {
    title: 'Vincular Cod Adapar a um MA',
    description: 'Grava/atualiza o vínculo entre um MA (registro federal) e um Cod (produto Adapar) no mapeamento local — usado depois que verificar_produto ou buscar_produto confirmam que os dois se referem ao mesmo produto, pra acelerar buscas futuras (agrofit_docs por cod, etc).',
    inputSchema: z.object({
      ma:  z.string().describe('Número de registro MA/Federal'),
      cod: z.string().describe('Código Adapar (Cod) a vincular a este MA'),
    }),
    annotations: write,
  },
  async ({ ma, cod }) => respond(await request('POST', '/api/agrofit-ids/link-cod', { body: { ma, cod } }))
)

server.registerTool(
  'banco_diagnostico',
  {
    title: 'Consultar diagnóstico por SIAGROALV',
    description: 'Consulta no Oracle institucional os diagnósticos (pragas/doenças cadastradas) associados a um código SIAGROALV.',
    inputSchema: z.object({ siagroalv: z.string().describe('Código SIAGROALV do diagnóstico') }),
    annotations: readOnly,
  },
  async ({ siagroalv }) => respond(await request('GET', '/api/banco/diagnostico', { query: { siagroalv } }))
)

const transport = new StdioServerTransport()
await server.connect(transport)
