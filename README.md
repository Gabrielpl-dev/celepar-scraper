# Celepar Scraper

Consulta de agrotóxicos (Celepar/PR) e bulas (Agrofit/MAPA).

Arquitetura completa, gotchas e fluxo de deploy: [`CLAUDE.md`](CLAUDE.md).
Documentação adicional em [`docs/`](docs/).

## Mapa de diretórios

- `backend/` — Express (rotas, libs, middleware). `npm start` sobe o servidor.
- `frontend/` — React/Vite. `npm run build` compila pra `backend/public/`.
- `legacy/` — páginas estáticas antigas ainda servidas pelo Express (`/banco`, `/caminhos`).
- `teste-cccb/` — sandbox standalone pra desenvolvimento do comparador CCCB.
- `scripts/` — utilitários de linha de comando avulsos (rodar com `node scripts/<arquivo>.js`).
- `docs/` — documentação de referência (schema, gotchas, specs históricas).
- `site_padrao_adapar_pesquisa/` — assets estáticos salvos do site da Adapar, só material de referência pro scraping.
- `notas/` — anotações pessoais do Gabriel (passo a passo manual, processos internos) — não é documentação de projeto.
- `SPEC-*.md` (raiz) — specs de features ativas ou recém-concluídas. Convenção: fica na raiz enquanto relevante, é removida quando a spec é totalmente implementada.
- `.envs/` — dados sensíveis de infra (gitignored, não existe num clone novo — ver `CLAUDE.md`).

Há também branches de trabalho isoladas em `git worktree` (`.claude/worktrees/`) — rode
`git worktree list` pra ver o que está em desenvolvimento fora do `main`.
