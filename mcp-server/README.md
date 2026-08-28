# celepar-scraper-mcp

Servidor MCP que expõe o **fluxo de negócio** do celepar_scraper (buscar,
verificar e comparar produtos agrotóxicos entre Celepar/Adapar, Agrofit,
SIGEN e o Oracle institucional) como tools pra agentes de IA.

Não é rota de deploy do app — é um **cliente** standalone que fala HTTP com o
backend já deployado (`.envs/infra.md`). Roda onde o agente for executado
(sua máquina, o servidor de automação etc.), nunca precisa estar no servidor
`C:\celepar_app\`.

## Escopo

14 tools cobrindo tudo que o app React usa (conferido contra
`frontend/src/views/*.jsx`): `buscar_produto`, `verificar_produto`,
`agrofit_docs`, `agrofit_link_cod`, `sigen_consultar`, `sigen_culturas`,
`cccb_culturas`, `cccb_comparar`, `extrair_cultura`, `comparar_culturas`,
`verificar_celepar`, `listar_celepar`, `buscar_siagro`, `banco_diagnostico`.
Nenhuma exige role admin — só `agrofit_link_cod` é escrita (upsert de
mapeamento), o resto é leitura.

Ficam de fora desta primeira versão, de propósito: SQL arbitrário no Oracle
(`POST /api/banco`) e as rotas admin de escrita (sincronizar culturas, editar
`agrofit_ids`, gerenciar tabelas). Se precisar delas depois, adicionam-se
tools novas seguindo o mesmo padrão de `src/index.js`.

## Setup

```bash
cd mcp-server
npm install
cp .env.example .env
```

Crie a conta de serviço (uma vez só — usa a senha do admin `GPL_SCRAPER` pra
registrar um usuário novo, role `viewer`, dedicado ao agente):

```bash
npm run setup-agent-account
```

Preencha `CELEPAR_AGENT_USERNAME`/`CELEPAR_AGENT_PASSWORD` no `.env` com o
que o script mostrar.

## Rodar

```bash
npm start
```

Fala stdio — registre no cliente MCP do seu agente (Claude Code, Claude
Agent SDK etc.) apontando pro comando `node mcp-server/src/index.js` deste
repo, com o `.env` acima carregado.
