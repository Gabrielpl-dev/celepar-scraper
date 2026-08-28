# SIGEN — API reversa (Consulta Pública de Agrotóxico, SC)

SIGEN+ (Cidasc/SC) é um ExtJS antigo sem documentação de API pública. Tudo abaixo foi
descoberto via engenharia reversa (DevTools + curl direto) em 26/08/2026.

**O scraping já existe** em `backend/lib/sigenClient.js` + `backend/routes/sigen.js`
(`GET /api/sigen?ma=`) — busca produto por MA e devolve nome, culturas, ingredientes
ativos, classe/forma de ação e PDFs (Bula/Ficha de Emergência). Antes de escrever
scraping novo pra SIGEN, olhar esse arquivo primeiro.

## Sessão

Cookie `SessionID_` obtido com GET em `/consultaagrotoxicocadastropublico/consultaagx`.
Todo POST subsequente precisa desse cookie + header `Referer` apontando pra essa página.
`sigenPost()` já cuida disso: abre sessão sob demanda e reabre (1 retry) se a resposta
não vier em JSON — o que cobre tanto sessão expirada quanto os erros 500 abaixo.

## Endpoints confirmados

### `POST /ConsultaAgrotoxicoCadastroPublico/CarregarConsultaAgrotoxico`

Busca principal. Form-urlencoded com ~20 campos de filtro: `nrRegistro`,
`nmMarcaComercial`, `csSituacao`, `cdNmComumEspecieVegetal` (= cultura),
`cdNmComumPraga`, `cdGrupoQuimico`, `cdIngredienteAtivo`, etc. Todos coded — esperam
código numérico da tabela de referência correspondente, não texto livre.

**Bug real do servidor**: filtrar por qualquer campo que não seja `nrRegistro` sozinho
estoura timeout de SQL (30s, `SqlException: Execution Timeout Expired`). Confirmado com
filtro de cultura (`cdNmComumEspecieVegetal=73`, "Fumo") e também sem filtro nenhum
(tentativa de listar tudo) — os dois travam. Só `nrRegistro` preenchido sozinho responde
rápido (~0.4s). **Na prática, hoje só dá pra consultar produto a produto por MA** — não
tem como pedir "todos os produtos da cultura X" direto pro SIGEN.

### `POST /ConsultaAgrotoxicoCadastroPublico/CarregarAgrotoxicoCadastro`

Detalhe completo, dado `idAgrotoxicoCadastro` (vem do resultado da busca acima).
Retorna:
- `listaCulturaAlvo.Current` — um item por combinação cultura×praga:
  `cdNomeComumEspecieVegetal`, `nmComumEspecieVegetal`, `nmCientificoPraga`,
  `dsObservacao` (instruções de uso completas). **É aqui que dá pra saber pra quais
  culturas um produto está registrado em SC — sem depender do filtro quebrado acima.**
- `listaIngredienteAtivo.Current` — ingrediente ativo, concentração, unidade, grupo
  químico.
- `classes`, `formaAcao`, `cdRepositorioArquivoBula`, `cdRepositorioArquivoFichaEmergencia`.

Os campos "básicos" desse endpoint (nome, situação, classificações) vêm vazios — esses
só existem na resposta da busca (`CarregarConsultaAgrotoxico`). É preciso combinar as
duas respostas pra ter o produto completo (é o que `sigenClient.buscarDetalhe` faz).

### `POST /Common/RepositorioArquivo/Download`

Download de PDF (Bula/Ficha de Emergência), dado `idRepositorioArquivo`. Instável — já
tratado com retry (5x) em `routes/sigen.js`.

### `POST /DSV.Tabelas/NomeComumEspecieVegetal/PerformSearch`

Tabela mestra de "cultura" (nome comum espécie vegetal): 526 registros,
`{id_nome_comum_especie_vegetal, nm_comum_especie_vegetal}`. Os parâmetros de filtro
que a UI manda (`nome`, `codigo`) parecem ser ignorados pelo backend — toda chamada
devolve a lista inteira, então uma busca sem filtro já traz tudo. Muda pouco → cacheável
por muito tempo (`sigenClient.listarCulturas`, TTL 24h).

O mesmo padrão (`/DSV.Tabelas/<Tabela>/...`) provavelmente existe pras outras lupas da
tela de consulta (Ingrediente Ativo, Formulação, Praga, Grupo Químico, Empresa) — não
testado ainda, só a de cultura.

## O caso Tabaco × Fumo (origem do ticket)

Na tabela mestra de cultura **existem os três**: `Fumo` (73), `FOLHAS DE FUMO` (202) e
`Tabaco` (151) — a cultura "Tabaco" **não está ausente da base**. O que trava é a busca
por nome na tela de consulta (autocomplete da UI): digitar "Tabaco" lá retorna 0
resultados mesmo o código existindo — bug da tela, não da base.

Como o filtro de cultura da consulta principal também está quebrado (timeout, acima), a
forma confiável de saber se um produto vale pra Tabaco é olhar `listaCulturaAlvo` no
detalhe por MA e comparar o nome ali — cada registro pode ter sido cadastrado como
"Fumo", "Tabaco" ou "Folhas de Fumo" dependendo de quem preencheu.

## Próximos passos (deixados em aberto)

Hoje a extração é só por MA (produto a produto) — é o que `GET /api/sigen?ma=` faz,
devolvendo tudo que o SIGEN sabe sobre aquele produto (culturas incluídas). Buscar
"todos os produtos de uma cultura" ainda não dá pra pedir direto ao SIGEN (filtro
quebrado) — só juntando o `listaCulturaAlvo` de cada MA já conhecido (via Celepar/Agrofit)
num índice local, produto a produto. Ainda não implementado — fica pra quando a
necessidade for específica (ex.: resolver o ticket real do Tabaco cruzando com a lista
de MAs que a Celepar já indica pra essa cultura).
