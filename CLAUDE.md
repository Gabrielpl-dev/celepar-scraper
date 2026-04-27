# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # Install dependencies
npm start        # Start server at http://localhost:3000 (also: npm run dev)
```

No build step, no tests, no linter configured.

## Architecture

This is a Node.js/Express server that wraps four original browser DevTools console scripts for scraping pesticide (agrotóxico) data from the Paraná state government's Celepar database. Instead of running snippets in a browser console, users hit a local REST API or open the bundled SPA.

**Backend** ([server.js](server.js)) — three core functions:

- `fetchPage` — fetches the Celepar listing page, decodes from `windows-1252` to UTF-8 (required for Portuguese accents), and caches responses for 5 minutes (`CACHE_TTL`).
- `parseRows` — uses cheerio to parse each `<tr>`: extracts crop name (`cultura`), product code (`cod2`) from `onclick` regex, target pest (`alvo`), and product status from `<font color="...">` tags.
- `buildUrl` — reconstructs the exact 30-parameter query string Celepar expects; most parameters are hardcoded as the literal string `"null"`.

Five API endpoints, each replicating one of the original scripts:

| Endpoint | Operation |
|---|---|
| `POST /api/extrair-cultura` | Filter rows by crop → return Cod2 codes |
| `POST /api/buscar-cod2` | Filter rows by Cod2 → return crops (deduped) |
| `POST /api/comparar` | Compare two crops: exclusive to each + common set |
| `POST /api/verificar` | Search by term → return product status colors |
| `GET /api/listar` | Raw dump of all parsed rows (debug) |

**Frontend** ([public/index.html](public/index.html)) — single-file SPA, no build step. Inline HTML/CSS/JS. Dark theme with lime/sky accents. Sidebar selects the operation; main panel renders API results as formatted tables.

## Key Implementation Details

- **Encoding**: Celepar serves `windows-1252`. `fetchPage` uses `TextDecoder('windows-1252')` with a `latin1` fallback. Corruption of accented characters (ã, é, ú) is almost always an encoding issue.
- **Diacritic normalization**: The `norm()` helper strips accents before comparing culture names, so `"milho"` matches `"Milho"` or `"mîlho"`.
- **Cache**: In-memory map keyed by full URL. 5-minute TTL (`CACHE_TTL = 5 * 60 * 1000`). All five endpoints share the same cached page fetch.
- **`buildUrl` defaults**: The `defaults` object in `server.js` holds the 30 static Celepar query parameters. Only `Cod` and `descIngrediente` are meant to vary at runtime.
- **Original scripts**: [Extrator Cod2 por cultura.js](Extrator%20Cod2%20por%20cultura.js), [Busca por Cod2.js](Busca%20por%20Cod2.js), [Comparador de Cod2.js](Comparador%20de%20Cod2.js), and [Verificar se ta ok ou não.js](Verificar%20se%20ta%20ok%20ou%20não.js) are kept as reference for the original browser-console logic.
