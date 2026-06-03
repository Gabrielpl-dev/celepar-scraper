# Gotchas

**Espaços nas URLs do Agrofit**
`URLSearchParams` codifica espaços como `+`, mas o Agrofit retorna 503. Sempre usar `.replace(/\+/g, '%20')` nas URLs enviadas ao Agrofit. Aplicado em `routes/agrofit.js`.

**Encoding Celepar**
O site serve `windows-1252`. Problemas com acentos começam aqui. Ver `lib/scraper.js` → `fetchPage`.

**Build do frontend**
Após editar `frontend/src/`, buildar antes de fazer push:
```bash
cd frontend && npm run build
```
O build vai para `backend/public/` que o Express serve como static. No servidor, após `git pull`, rodar o build e reiniciar o NSSM.

**Credenciais NSSM vs Registry do Windows**
`NSSM AppEnvironmentExtra` tem **precedência** sobre variáveis do registry do sistema. Se atualizar o registry e o servidor não pegar as novas credenciais, é porque o NSSM tem cópias antigas. Atualizar via:
```
<NSSM_EXE> set CeleparApp AppEnvironmentExtra "AGROFIT_KEY=... AGROFIT_SECRET=..."
```

**PDF Agrofit via iframe**
Iframes abrem URLs diretamente no browser sem enviar o header `Authorization`. Por isso `/api/agrofit-pdf` é público — fica em `routes/agrofit-public.js`, registrado antes do `requireAuth`.
