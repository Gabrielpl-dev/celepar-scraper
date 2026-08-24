# Frontend — Celepar Scraper

React (Vite) — consulta e verificação de agrotóxicos (Celepar/Adapar, Agrofit, SIGEN).

## Rodando

```bash
npm run dev       # dev server com HMR, proxy /api -> http://localhost:3000
npm run build     # compila pra ../backend/public/ (é isso que o Express serve em produção)
npm run preview   # serve o build localmente, sem proxy
npm run lint      # eslint
```

Duas entradas de build (`vite.config.js → rollupOptions.input`): `index.html` (app principal) e
`extracao.html` (fluxo de extração de bula, servido em `/extracao`).

## Estrutura

- `src/App.jsx` — router + estado global de parâmetros (`{ Cod, ma, nome }`)
- `src/views/` — uma tela por arquivo: `ParamsView`, `BulaView`, `ExtrairView`, `SiagroView`,
  `CompararView`, `VerificarView`, `ListagemView`, `AuthView`/`LoginView`/`RegisterView`,
  `FeView`, `LinksView`
- `src/api.js` — chamadas ao backend, sempre com `Authorization: Bearer <JWT>`
- `src/extracao/` — app separado (entrada `extracao.html`) pro fluxo de extração via IA

Arquitetura completa do projeto (backend, integrações externas, gotchas): [`../CLAUDE.md`](../CLAUDE.md).
