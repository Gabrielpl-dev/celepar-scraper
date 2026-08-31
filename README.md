# AgroCheck

Consulta e verificação cruzada de agrotóxicos entre múltiplas fontes: Celepar/Adapar (PR),
Agrofit/Embrapa (federal), SIGEN (SC) e o banco Oracle institucional (REAG) — mais uma expansão em
andamento pra verificar existência em outros sistemas estaduais (ver `STATUS.md` na raiz, quando
presente). "Celepar Scraper" foi o nome inicial do projeto (ainda é o nome da pasta/repositório) —
o produto em si se chama **AgroCheck** (título da página, banner do servidor, manifest do PWA).

Arquitetura completa, gotchas e fluxo de deploy: [`CLAUDE.md`](CLAUDE.md).
Documentação adicional em [`docs/`](docs/).

## O que faz

- Cruza o cadastro de um produto agrotóxico entre 4 fontes (Celepar/Adapar, Agrofit, SIGEN, Oracle
  institucional) e mostra como uma entrada só, mesmo quando cada fonte guarda o produto sob um
  código diferente (MA/Cod).
- Compara o cadastro Oracle x Celepar por cultura (comparador CCCB): aponta o que tá certo,
  errado, faltando ou bloqueado por diagnóstico.
- Expõe a mesma lógica de negócio como tools MCP pra agentes de IA (`mcp-server/`).

Extração de bula em PDF via IA (agora só via CLI do Claude Code, sem provider externo) é
protótipo em andamento no worktree `extracao-claude-code` (kanban de cadastro) — ainda não é
feature do `main`.

## Rodando (dev local, opcional)

```bash
npm install                    # dependências raiz (concurrently)
npm run dev                    # backend + frontend em paralelo
cd frontend && npm run build   # build de produção -> backend/public/
```

Deploy de verdade não é isso — servidor e Oracle REAG rodam numa máquina remota, nunca aqui (ver
"Ambiente de execução" no `CLAUDE.md`). O fluxo real é `git push` -> `git pull` no servidor ->
`pm2 reload`.

## Mapa de diretórios

- `backend/` — Express (rotas, libs, middleware). `npm start` sobe o servidor.
- `frontend/` — React/Vite. `npm run build` compila pra `backend/public/`.
- `mcp-server/` — servidor MCP standalone que expõe o fluxo de negócio (buscar/verificar/comparar
  produto) como tools pra agentes de IA — cliente HTTP do backend já deployado, não roda no
  servidor de produção (ver `mcp-server/README.md`).
- `eval-harness/` — cliente HTTP standalone que bate uma bateria de casos reais contra a API em
  loop, comparando contra um gabarito capturado, pra pegar regressão silenciosa em refactors
  (ver `eval-harness/README.md`).
- `legacy/` — páginas estáticas antigas ainda servidas pelo Express (`/banco`, `/caminhos`).
- `teste-cccb/` — sandbox standalone pra desenvolvimento do comparador CCCB.
- `scripts/` — utilitários de linha de comando avulsos (rodar com `node scripts/<arquivo>.js`).
- `docs/` — documentação de referência (schema, gotchas, specs históricas).
- `site_padrao_adapar_pesquisa/` — assets estáticos salvos do site da Adapar, só material de referência pro scraping.
- `notas/` — anotações pessoais do Gabriel (passo a passo manual, processos internos) — não é documentação de projeto.
- `SPEC-*.md` (raiz) — specs de features ativas ou recém-concluídas. Convenção: fica na raiz enquanto relevante, é removida quando a spec é totalmente implementada.
- `STATUS.md` (raiz, quando presente) — roadmap temporário de uma tarefa de build em andamento (mesma convenção do `SPEC-*.md`: some quando a tarefa termina).
- `.envs/` — dados sensíveis de infra (gitignored, não existe num clone novo — ver `CLAUDE.md`).

Há também branches de trabalho isoladas em `git worktree` (`.claude/worktrees/`) — rode
`git worktree list` pra ver o que está em desenvolvimento fora do `main`.

## Licença

Uso interno. Sem licença de código aberto — não distribuir nem reusar fora deste contexto.
