# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ambiente de execução

O servidor e o banco de dados rodam em uma máquina remota (ver `.envs/infra.md` para IP e detalhes de infra). **Esta máquina local é apenas para edição de código.**

Fluxo de deploy:
1. Fazer as alterações aqui localmente
2. `git push`
3. No servidor remoto: `git pull` → build frontend → reiniciar via NSSM:
   ```
   <NSSM_EXE> restart CeleparApp
   ```

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
- `/teste/` — sandbox de desenvolvimento / tester da API Agrofit
- `/banco/` — explorador Oracle (SQL, tabelas)
- `/banco/internos` — explorador SQLite
- `/caminhos/` — mapa de navegação admin (requer role=admin)

## Key Implementation Details

- **Encoding Celepar**: site serve `windows-1252`. `lib/scraper.js → fetchPage` usa `TextDecoder('windows-1252')` com fallback `latin1`. Corrupção de acentos quase sempre começa aqui.
- **Espaços em URLs Agrofit**: `URLSearchParams` codifica espaços como `+`, mas Agrofit retorna 503. Sempre usar `.replace(/\+/g, '%20')`.
- **Agrofit token**: `lib/agrofitApi.js` faz auto-refresh 60s antes de expirar. Credenciais `AGROFIT_KEY`/`AGROFIT_SECRET` ficam no NSSM `AppEnvironmentExtra` (não no registry do Windows — NSSM tem precedência).
- **PDF Agrofit**: `/api/agrofit-pdf` é público (sem JWT) — iframes não enviam headers. Registrado em `routes/agrofit-public.js` **antes** do `requireAuth`.
- **Merge de fontes**: `routes/banco.js → /api/buscar-produto` mescla Celepar + Agrofit por `norm(nome)` — mesmo produto de fontes diferentes vira uma entrada com `fonte: 'ambos'`.
- **`buildUrl` defaults**: objeto `defaults` em `lib/scraper.js` tem os 30 parâmetros estáticos do Celepar. Só `Cod` e `descIngrediente` variam.
- **Secrets**: `JWT_SECRET`, `ORACLE_*`, `AGROFIT_*` ficam no NSSM `AppEnvironmentExtra` no servidor. `.env` só tem `PORT=3000`.
