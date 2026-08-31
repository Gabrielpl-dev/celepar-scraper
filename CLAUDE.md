# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ambiente de execução

O servidor e o banco de dados rodam em uma máquina remota (ver `.envs/infra.md` para IP e detalhes de infra). **Esta máquina local é apenas para edição de código.**

Fluxo de deploy:
1. Fazer as alterações aqui localmente
2. `git push`
3. No servidor remoto: `git pull` → build frontend → reiniciar via PM2:
   ```
   pm2 reload CeleparApp
   ```
   Em caso de falha grave (processo travado): `pm2 delete CeleparApp && pm2 start ecosystem.config.cjs && pm2 save`

Nunca tente rodar o servidor ou banco localmente — não faz sentido neste ambiente.

## Commands

```bash
# Desenvolvimento local (PM2, opcional)
npm install          # instala dependências raiz (concurrently)
npm run dev          # sobe backend + frontend em paralelo via PM2/concurrently

# Build do frontend (obrigatório antes de deploy)
cd frontend && npm run build   # compila React → backend/public/
```

No tests, no linter configured.

## Eval harness (regressão silenciosa)

`eval-harness/` bate uma bateria de casos reais contra a API rodando (Agendador de
Tarefas local, 10 em 10min) e compara contra um gabarito capturado — pega regressão que
não crasha nada (resposta muda de conteúdo, mas continua 200 OK). Ver
`eval-harness/README.md` e `eval-harness/POR_QUE.md`.

**Toda rota nova ou mudança de comportamento numa rota existente precisa de um caso em
`eval-harness/src/casos.js`.** Ao adicionar: rodar `npm run capturar-gabarito -- --casos=<nome>`
só depois de confirmar visualmente que a resposta está certa — nunca capturar gabarito de
uma rota cujo comportamento ainda não foi validado.

## Architecture

Node.js/Express backend + React (Vite) frontend. O backend serve o build estático do frontend em `backend/public/`. Em dev, Vite roda separado com proxy.

**Serviços de dados:**
- **Celepar/Adapar** — scraping do site PR (encoding `windows-1252`, cache 5min)
- **Agrofit/Embrapa** — API REST OAuth2 `client_credentials` (Key+Secret no registry Windows via NSSM)
- **SIGEN** — scraping Santa Catarina
- **Oracle REAG** — banco institucional (Oracle Instant Client, path em `.envs/infra.md`)
- **SQLite local** — `agrofit_ids.db` (users + mapeamentos MA/ID)

**Backend** (`backend/`):
- `server.js` — Express principal; rotas públicas antes do `requireAuth`
- `routes/` — auth, celepar, agrofit, agrofit-public, sigen, banco, internos
- `lib/` — scraper.js (fetchPage/parseRows/buildUrl), agrofitApi.js (token auto-refresh), agrofitCsv.js, sigenClient.js
- `middleware/` — requireAuth.js, requireAdmin.js

**Frontend** (`frontend/src/`):
- `App.jsx` — router + estado global (params: `{Cod, ma, nome}`)
- `views/` — ParamsView, BulaView, ExtrairView, SiagroView, CompararView, VerificarView, ListagemView, AuthView
- `api.js` — chamadas ao backend (sempre envia JWT `Authorization: Bearer`)

**Páginas legacy** (servidas como static pelo Express):
- `/banco/` — explorador Oracle (SQL, tabelas)
- `/banco/internos` — explorador SQLite
- `/caminhos/` — mapa de navegação admin (requer role=admin)

## Key Implementation Details

- **Encoding Celepar**: site serve `windows-1252`. `lib/scraper.js → fetchPage` usa `TextDecoder('windows-1252')` com fallback `latin1`. Corrupção de acentos quase sempre começa aqui.
- **Espaços em URLs Agrofit**: `URLSearchParams` codifica espaços como `+`, mas Agrofit retorna 503. Sempre usar `.replace(/\+/g, '%20')`.
- **Agrofit token**: `lib/agrofitApi.js` faz auto-refresh 60s antes de expirar. Credenciais `AGROFIT_KEY`/`AGROFIT_SECRET` vêm de env var (ver `.env.example`).
- **PDF Agrofit**: `/api/agrofit-pdf` é público (sem JWT) — iframes não enviam headers. Registrado em `routes/agrofit-public.js` **antes** do `requireAuth`.
- **Merge de fontes**: `routes/banco.js → /api/buscar-produto` mescla Celepar + Agrofit por `norm(nome)` — mesmo produto de fontes diferentes vira uma entrada com `fonte: 'ambos'`.
- **`buildUrl` defaults**: objeto `defaults` em `lib/scraper.js` tem os 30 parâmetros estáticos do Celepar. Só `Cod` e `descIngrediente` variam.
- **Secrets**: todos ficam em `backend/.env` (gitignored, nunca commitado — nem no servidor nem localmente). Lista completa de variáveis necessárias em `backend/.env.example`; copiar pra `.env` e preencher com valor real (cofre de senhas Celepar / portal Agrofit-Embrapa). Se o servidor ainda usa NSSM `AppEnvironmentExtra` pra alguma dessas, convive sem conflito — `dotenv` nunca sobrescreve variável já setada.
