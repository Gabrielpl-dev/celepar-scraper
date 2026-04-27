# Reag · Celepar Scraper

Interface standalone pros 4 scripts JS de DevTools que você usa pra extrair dados da [listagem de agrotóxicos do PR](https://celepar07web.pr.gov.br/agrotoxicos/listar.asp).

**Sem abrir o navegador no site oficial** — o backend Node faz o fetch da página e replica a lógica dos scripts originais com `cheerio`. Você só abre o `localhost:3000` na primeira vez pra usar a UI.

## Estrutura

```
reag-scraper/
├── server.js          # backend express + cheerio
├── package.json
└── public/
    └── index.html     # UI single-file (HTML + CSS + JS puros)
```

## Instalar e rodar

```bash
cd reag-scraper
npm install
npm start
```

Depois abre `http://localhost:3000`.

> Requer Node 18+ (pra ter `fetch` nativo).

## O que cada operação faz

| # | Operação | Script original | Endpoint |
|---|---|---|---|
| 01 | Extrair Cod2 por cultura | `Extrator Cod2 por cultura.js` | `POST /api/extrair-cultura` |
| 02 | Buscar por Cod2 | `Busca por Cod2.js` | `POST /api/buscar-cod2` |
| 03 | Comparar duas culturas | `Comparador de Cod2.js` | `POST /api/comparar` |
| 04 | Verificar produto (cor) | `Verificar se ta ok ou não.js` | `POST /api/verificar` |
| -- | Listagem bruta (debug) | — | `GET /api/listar` |

## Parâmetros da URL

A sidebar tem só `Cod` e `descIngrediente` — os outros 28 parâmetros são preenchidos automaticamente como `null`/vazio na hora do fetch, replicando exatamente a URL que você usa.

Pra mudar isso, edita o objeto `defaults` em `server.js` → `buildUrl()`.

## Cache

Tem cache em memória de 5min por URL — evita martelar o servidor do PR enquanto você troca filtros na UI. TTL configurável em `CACHE_TTL` no `server.js`.

## Encoding

O Celepar serve em `windows-1252`. O server decodifica explicitamente, então acentos vêm corretos no JSON da API.

## Próximos passos (sugestões)

- Persistir resultados em SQLite pra histórico
- Endpoint `/api/scrape-all` que itera todos os `Cod` conhecidos e popula uma base local
- Integrar com a pipeline Reag (Celery + Redis) — esses endpoints já estão prontos pra serem chamados como tasks
- Exportar pra Postgres direto, em vez de CSV
