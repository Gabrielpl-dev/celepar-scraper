# Por que este harness existe

Surgiu numa sessão (31/08/2026) logo depois de extrair `culturaMatcher.js` e
`produtoMatcher.js` de `routes/banco.js` (Fase 2 do `SPEC-desacoplamento.md`). O medo do
Gabriel, levantado naquele momento: um refactor mecânico desses pode **parecer**
correto — nada crasha, todo endpoint continua devolvendo 200 OK — e mesmo assim ter
mudado sutilmente o resultado por baixo (ex: `resolveKey` resolvendo pra cultura errada,
o merge Celepar↔Agrofit deixando de casar um alias). Esse tipo de erro é o mais perigoso
justamente porque não avisa sozinho.

Não dava pra escrever teste automatizado tradicional pra isso: o projeto não tem suíte de
testes, boa parte da lógica depende do Oracle real (`.envs/infra.md`), e não é possível
rodar o servidor/banco localmente (ver `CLAUDE.md`). A saída foi usar **o próprio
servidor de produção, no estado de ANTES do deploy, como gabarito**: capturar a resposta
real de hoje pra um punhado de casos conhecidos, e depois de qualquer deploy que mexa em
rota, comparar a resposta nova contra esse gabarito. Divergência = ou o comportamento
mudou de propósito (aí recaptura o gabarito) ou é uma regressão de verdade (aí achou o
bug antes do usuário).

Rodar em loop (Agendador de Tarefas, não sessão do Claude Code) responde a uma
preocupação maior ainda do Gabriel: descobrir se o sistema piora num momento em que
ninguém está olhando. Foi literalmente o que aconteceu com o processo PM2 `celepar-be`
rodando local desde 1º de junho, crash-loopando 12.582 vezes sem ninguém notar — o
harness existe pra não depender de alguém estar de olho pra pegar esse tipo de coisa.
