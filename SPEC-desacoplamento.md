# SPEC: Desacoplamento do backend

## Contexto

`banco.js` é um God File (586 linhas, 12 endpoints, 8 dependências diretas). Lógica de negócio vive dentro de route handlers, `norm()` está duplicada em 3 arquivos com 2 variantes extras, e URLs/paths estão hardcoded. Nenhum teste automatizado — cada fase exige verificação manual dos endpoints afetados.

## Fases

### Fase 1 — Normalização (baixo risco)
**Arquivo novo:** `backend/lib/normalizer.js`

Extrair para um único lugar:
- `norm(s)` — base (de `scraper.js`)
- `normSep(s)` — norm + separadores (de `banco.js`)
- `celNorm(s)` — normSep + alias Celepar→banco (de `banco.js`)
- `tokenize(s)` — para Jaccard (de `banco.js`)

Atualizar imports em: `scraper.js`, `agrofitCsv.js`, `banco.js`.

Verificar: busca de produto, CCCB, Celepar listing.

---

### Fase 2 — Matchers (médio risco)
**Arquivo novo:** `backend/lib/culturaMatcher.js`

Extrair de `banco.js:/cccb`:
- `BANCO_PARA_CELEPAR`, `CELEPAR_PARA_BANCO` (constantes de alias)
- `celeparNormFor(cultura, culturaid)`
- `jaccard(a, b)`
- `resolveKey(cn, celeparSets)`
- Lógica de classificação correto/errado/faltando

**Arquivo novo:** `backend/lib/produtoMatcher.js`

Extrair de `banco.js:/buscar-produto`:
- `isTruncMatch(shorter, longer)`
- Loop de merge Celepar→Agrofit (orphans logic)

Verificar: endpoint `/cccb`, endpoint `/buscar-produto`.

---

### Fase 3 — Config centralizada (baixo risco)
**Arquivo novo:** `backend/lib/config.js`

Centralizar:
- `C:\\oracle\\instantclient_21_15` (banco.js:39)
- `TABELAS_JSON` e `DB_PATH` (banco.js:13-14)
- Paths do SQLite em `db.js` e `routes/internos.js`

URLs externas já estão isoladas em cada `lib/` — deixar como estão (cada cliente owna sua URL).

Verificar: inicialização do servidor, Oracle connection.

---

### Fase 4 — Quebrar banco.js (alto risco)
Dividir em rotas menores. Proposta:

| Arquivo novo | Endpoints |
|---|---|
| `routes/oracle.js` | `/banco` (SQL), `/banco/buscar`, `/banco/diagnostico`, `/banco/tabelas/*` |
| `routes/produtos.js` | `/buscar-produto`, `/verificar-produto` |
| `routes/culturas.js` | `/culturas/sincronizar`, `/cccb/culturas`, `/cccb/build-mapping` |
| `routes/cccb.js` | `/cccb`, `/cccb/watch` |

`oracleConn()` e `oracleReady` movem para `lib/oracleDb.js` (compartilhado entre as novas rotas).

Atualizar `server.js` com os novos mounts.

Verificar: todos os 12 endpoints de banco, SSE watch, frontend ExtrairView e VerificarView.

---

### Fase 5 — scraper.js (médio risco)
Separar as 7 responsabilidades atuais:

| Arquivo novo | Conteúdo |
|---|---|
| `lib/celepar/fetcher.js` | `fetchPage`, `fetchPesquisa`, cache Map |
| `lib/celepar/urlBuilder.js` | `buildUrl`, objeto `defaults` |
| `lib/celepar/parser.js` | `parseRows`, `parsePesquisaRows`, `parseLinkeaPage`, `enrichLinkeaRows`, validators |

`norm` já estará em `normalizer.js` após Fase 1 — remover de `scraper.js`.

`scraper.js` vira re-export de compatibilidade temporário até todos os callers serem atualizados.

Verificar: todas as rotas de `celepar.js`, `banco.js` (pós-Fase 4), `extracao.js`.

---

## Ordem recomendada

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
```

Cada fase é independente das posteriores. Parar após qualquer fase deixa o sistema funcional.

---

## Checklist

### Fase 1 — Normalização ✓
- [x] Criar `backend/lib/normalizer.js` com `norm`, `normSep`, `tokenize`
- [x] Remover `norm` de `scraper.js`, importar de `normalizer`
- [x] Remover `norm` de `agrofitCsv.js`, importar de `normalizer`
- [x] Remover `normSep`, `tokenize` de `banco.js`, importar de `normalizer`
- [ ] Testar: busca de produto, CCCB, Celepar listing

### Fase 2 — Matchers
- [ ] Criar `backend/lib/culturaMatcher.js`
- [ ] Criar `backend/lib/produtoMatcher.js`
- [ ] Atualizar `banco.js` para usar os dois
- [ ] Testar: `/api/cccb`, `/api/buscar-produto`

### Fase 3 — Config ✓
- [x] Criar `backend/lib/config.js`
- [x] Atualizar `banco.js` (Oracle path, JSON/DB paths)
- [x] Atualizar `routes/internos.js` (CULTURAS_DB, AGROFIT_DB)
- [ ] Testar: inicialização, Oracle connection

### Fase 4 — Quebrar banco.js
- [ ] Criar `backend/lib/oracleDb.js` (`oracleConn`, `oracleReady`)
- [ ] Criar `routes/oracle.js`
- [ ] Criar `routes/produtos.js`
- [ ] Criar `routes/culturas.js`
- [ ] Criar `routes/cccb.js`
- [ ] Atualizar `server.js`
- [ ] Remover `banco.js`
- [ ] Testar: todos os 12 endpoints, SSE, frontend

### Fase 5 — scraper.js
- [ ] Criar `lib/celepar/fetcher.js`
- [ ] Criar `lib/celepar/urlBuilder.js`
- [ ] Criar `lib/celepar/parser.js`
- [ ] Criar `lib/celepar/index.js` (re-export de compatibilidade)
- [ ] Atualizar callers: `routes/celepar.js`, `routes/cccb.js`, `extracao.js`
- [ ] Remover `scraper.js`
- [ ] Testar: listing Celepar, CCCB, extração
