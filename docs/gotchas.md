# Gotchas

**Espaços nas URLs do Agrofit**
`URLSearchParams` codifica espaços como `+`, mas o Agrofit retorna 503. Sempre usar `.replace(/\+/g, '%20')` nas URLs enviadas ao Agrofit. Aplicado em `routes/agrofit.js`.

**Encoding Celepar**
O site serve `windows-1252`. Problemas com acentos começam aqui. Ver `lib/scraper.js` → `fetchPage`.

**Build do frontend**
Após editar `frontend/src/`, rodar dentro de `frontend/`:
```bash
npm run build
pm2 restart celepar-be
```
