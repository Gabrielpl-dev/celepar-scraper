# celepar-scraper-eval-harness

Bate uma bateria de casos reais contra a API do AgroCheck, comparando cada resposta
contra um **gabarito capturado antes** — pensado especificamente pra pegar regressão
silenciosa (a rota continua respondendo 200 OK, mas o conteúdo mudou) que um refactor
como o desacoplamento de `banco.js` poderia introduzir sem crashar nada.

Não é rota de deploy do app — é um **cliente** standalone que fala HTTP com o backend já
deployado (`.envs/infra.md`), igual o `mcp-server/`.

**Uma rodada por invocação, não um daemon com loop interno** — quem repete é o Agendador
de Tarefas do Windows (ver "Onde rodar"), mesmo padrão do ATLAS-Loop do Gabriel. De
propósito: um processo de vida curta que trava ou crasha só perde uma rodada; um daemon
com loop interno que trava fica preso pra sempre e, se estiver sob PM2 sem cuidado, vira
restart-loop igual o que corrompeu `backend/agrofit_ids.db` por meses (achado real desta
mesma sessão) — nunca mais esse padrão de propósito.

## Setup

```bash
cd eval-harness
npm install
cp .env.example .env
```

Crie a conta de serviço (uma vez só — usa a senha do admin `GPL_SCRAPER` pra registrar um
usuário novo, role `viewer`, dedicado ao harness):

```bash
npm run setup-agent-account
```

Preencha `CELEPAR_EVAL_USERNAME`/`CELEPAR_EVAL_PASSWORD` no `.env` com o que o script
mostrar.

## Fluxo de uso — capturar gabarito ANTES de deployar uma mudança

```bash
npm run capturar-gabarito
```

Grava a resposta de hoje (contra o código que já está em produção) em
`gabarito/<caso>.json`. Rode isso **antes** de fazer `pm2 reload CeleparApp` com uma
mudança que mexeu em rota (desacoplamento, SIGEN, estaduais etc.) — assim o gabarito é
sempre o comportamento correto conhecido, não o novo código testando a si mesmo.

Os arquivos de `gabarito/` são versionados no git de propósito (fixture, igual as bulas
de exemplo em `docs/exemplos/`) — servem de histórico de "isso é o que a API respondia
quando confirmamos que estava certo".

`--casos=nome1,nome2` filtra quais gravar. Útil quando um caso testa rota **nova** (sem
gabarito "certo" possível antes do deploy, porque a rota nem existia) — depois de
deployar e conferir visualmente que ficou certo, recaptura só esse caso, sem sobrescrever
o gabarito das rotas antigas com a resposta do código novo (que é o que queremos conferir,
não redefinir como "certo" de cara):

```bash
npm run capturar-gabarito -- --casos=sigen_culturas,estaduais_ma6715,estaduais_ma12525
```

## Rodar (uma rodada)

```bash
npm start
```

Loga uma linha JSON por caso + um resumo, em stdout, e termina. Pensado pra ir direto pro
log de quem invocar (Agendador de Tarefas capturando a saída em arquivo).

Cada linha de caso tem: `status`, `tempoMs` (com `lento: true` se > 5s — o padrão do
ORA-12170 documentado em `.envs/infra.md`), `bateuGabarito` (`true`/`false`/`null` se
não tinha gabarito ainda), e `diffs` (caminhos que divergiram, só quando não bateu).

## Onde rodar

**Já rodando** nesta máquina: tarefa `CeleparEvalHarness` no Agendador de Tarefas do
Windows, a cada 10min (`rodar.ps1`), batendo em
`CELEPAR_API_BASE_URL=http://140.238.238.172:3000`. `MultipleInstances=IgnoreNew` (não
empilha se uma rodada atrasar) + `ExecutionTimeLimit=5min` (mata sozinho se travar — ver
histórico de ORA-12170 travando indefinidamente em `.envs/infra.md`). Log acumula em
`logs/eval.log` (gitignored). Não depende de sessão do Claude Code nem do servidor de
produção pra existir — só desta máquina ligada.

Ver/editar a tarefa: `Get-ScheduledTask -TaskName CeleparEvalHarness` /
`Get-ScheduledTaskInfo -TaskName CeleparEvalHarness` (PowerShell).

Alternativa mais robusta (não depende desta máquina): mesma ideia rodando dentro de
`C:\celepar_app\` no servidor de produção (Agendador de Tarefas de lá, ou PM2 com
`cron_restart` em vez de `autorestart` — nunca daemon com loop interno sob PM2 puro, é
o padrão que já causou o crash-loop). Precisa de deploy manual no servidor — sem acesso
remoto automatizado ainda (ver card do Trello sobre isso). Nesse caso,
`eval-harness/.env` lá aponta `CELEPAR_API_BASE_URL=http://localhost:3000`.

## Casos cobertos

`src/casos.js` — só leitura, nenhuma tool exige escrita. MAs escolhidos por já
aparecerem documentados no código/histórico como produtos reais (Zapp QI 620, Roundup,
MA 6715/12525/9525/12908) — não são inventados, então a resposta de hoje é confiável
como gabarito.
