# Restrição de cultura por produto (RESTRICAOCULTURA) no motor CCCB — design

## Problema

O motor de comparação Oracle × Celepar (`/api/banco/cccb`, usado pela tela `teste-cccb`) hoje só
enxerga `RECEITPADRAO`/`CULTURA`/`DIAGNOSTICO`/`AGROTOXICO` (ver `docs/comparacao-oracle-celepar.md`).
Ele não sabe que existe uma tabela `RESTRICAOCULTURA` onde o banco registra que um produto está
bloqueado/restrito pra uma cultura. Resultado: culturas corretamente bloqueadas aparecem em
`errados`/`faltando` como se fossem divergência de dado, quando na verdade estão no estado
esperado.

## As duas tabelas de restrição (confirmadas por Gabriel)

Duas tabelas Oracle separadas, uma por granularidade — documentadas em `banco/schema.md`:

### `RESTRICAOCULTURA` — bloqueio da cultura inteira

| Coluna       | Descrição                          |
|--------------|-------------------------------------|
| IDAGROTOXICO | FK → `AGROTOXICO.AGROTOXICOID`      |
| CULTURAID    | → CULTURA.CULTURAID                 |
| UF           | ex: `'PR'`                          |
| ATIVO        | flag de bloqueio ativo — valor literal `'Sim'` |

### `RESTRICAODIAG` — bloqueio de um diagnóstico específico dentro da cultura

| Coluna        | Descrição                          |
|---------------|--------------------------------------|
| IDAGROTOXICO  | FK → `AGROTOXICO.AGROTOXICOID`       |
| CULTURAID     | → CULTURA.CULTURAID                 |
| DIAGNOSTICOID | → DIAGNOSTICO.DIAGNOSTICOID         |
| UF            | ex: `'PR'`                          |
| ATIVO         | flag de bloqueio ativo — valor literal `'Sim'` |

Isso resolve uma dúvida que eu tinha: como o lado Oracle sabe, independente de
`RECEITPADRAO`/`DIAGNOSTICO`, que um diagnóstico específico está bloqueado — é via
`RESTRICAODIAG`, não uma coluna dentro de `RECEITPADRAO`. Mapeamento direto pra fórmula:

```
culturaBloqOracle = existe linha em RESTRICAOCULTURA (IDAGROTOXICO=a.AGROTOXICOID, CULTURAID=cultura, UF='PR', ATIVO='Sim')
diagBloqBanco     = existe linha em RESTRICAODIAG     (IDAGROTOXICO=a.AGROTOXICOID, CULTURAID=cultura, DIAGNOSTICOID=diag, UF='PR', ATIVO='Sim')
```

`a.AGROTOXICOID` vem do mesmo join com `AGROTOXICO` que a query do `/cccb` já faz por
`REGISTROMA = :ma` — só precisa passar a selecionar essa coluna também.

## Regra de negócio — validada linha a linha num truth table de 64 combinações

Gabriel construiu à mão uma tabela verdade (2⁶ = 64 linhas) cruzando 6 variáveis booleanas:

- `Existe na adapar?` / `Existe no Oracle?` — o produto tem receita ativa cadastrada pra essa
  cultura em cada sistema.
- `Cultura bloqueada na adapar` / `Cultura bloqueada no oracle?` — restrição de cultura inteira.
- `Diagnóstico bloqueado na adapar` / `Diagnóstico bloqueado no banco?` — restrição de um
  diagnóstico/alvo específico dentro da cultura.

Contra 4 saídas: `É erro?`, `Está faltando?`, `Faltando bloquear cultura`, `Faltando bloquear
diagnóstico?`. Verificado por script (Node, brute-force sobre as 64 linhas) até bater 0
inconsistências. Duas correções feitas por Gabriel durante a validação (linha 6 e linha 9)
foram necessárias pra fechar a regra — a formula abaixo é a que sobrou depois delas.

### Fórmula final (depois de validada)

Quando **existe na Adapar** (`existeAdapar = true`):

```
cultOver  = culturaBloqOracle && !culturaBloqAdapar   // banco bloqueou cultura que a Adapar libera
diagOver  = diagBloqBanco    && !diagBloqAdapar        // banco bloqueou diagnóstico que a Adapar libera
cultUnder = culturaBloqAdapar && !culturaBloqOracle    // Adapar bloqueia cultura, banco ainda não
diagUnder = !culturaBloqAdapar && diagBloqAdapar && !diagBloqBanco
            // Adapar bloqueia o diagnóstico e banco não — só conta se a cultura em si
            // já não estiver marcada como bloqueada na Adapar (senão é redundante)

erro           = cultOver || diagOver
faltCultura    = cultUnder
faltDiagnostico= diagUnder
falta          = existeAdapar && !existeOracle   // puramente sobre existência de receita ativa,
                                                  // independente de bloqueio
```

Quando **NÃO existe na Adapar** (`existeAdapar = false`): qualquer uma das outras 5 variáveis
vindo `true` é uma contradição lógica (nada pode estar bloqueado ou existir num nível abaixo de
algo que nem existe) → `erro = true`. Só não é erro quando todas as outras 5 também são `false`
(estado totalmente nulo — a cultura genuinamente não se aplica a esse produto).

`faltCultura`/`faltDiagnostico` são sempre `false` nesse ramo (não faz sentido “faltar bloquear”
algo que já nem existe).

## O que ainda falta confirmar antes de implementar

1. ~~`IDAGROTOXICO` — FK de `AGROTOXICO.AGROTOXICOID` ou `REGISTROMA`?~~ **Confirmado por
   Gabriel: é FK de `AGROTOXICO.AGROTOXICOID`.** `banco/schema.md` já atualizado com essa
   coluna na tabela `AGROTOXICO`.
2. ~~Valor literal de `ATIVO`~~ **Confirmado por Gabriel: `'Sim'`.**
3. ~~Como ler "bloqueada na Adapar" a partir do scraping~~ **Resolvido — investigado ao vivo na
   página real (produto EVIDENCE 700 WG, `Cod=274`, mesma URL/página que `parseRows` já
   busca).** A página tem uma tabela "Cultura/Alvo" com **4 colunas**:
   `Cultura | Status Cultura | Alvo | Status Alvo`. Cada uma das duas colunas de status só
   assume 2 valores, marcados de forma idêntica ao padrão que `verificar-cod2.js` já usa pra
   toxicidade — texto dentro de `<font>`, com `color="red"` só quando bloqueado:

   ```html
   <!-- liberado -->
   <td><font size="1">Liberado</font></td>
   <!-- bloqueado -->
   <td><font size="1" color="red">Não Liberado</font></td>
   ```

   Confirmado ao vivo (produto real, 43 linhas): quando `Status Cultura = "Não Liberado"`
   (ex.: Almeirão, Chicória pra esse produto), o `Status Alvo` daquela linha **também** vem
   `"Não Liberado"` sempre — bate exatamente com a regra já validada na tabela-verdade
   ("cultura bloqueada implica diagnóstico bloqueado" do lado Adapar).

   **Mapeamento pro parser**: `parseRows` (`lib/scraper.js`) já itera esse `<tr>` (é a mesma
   linha de onde `cultura`, `siagro` e `alvo` já são extraídos — `alvo` já é `$tds.eq(2)`).
   Só falta capturar `$tds.eq(1)` (Status Cultura) e `$tds.eq(3)` (Status Alvo) e resolver:

   ```js
   culturaBloqAdapar = $tds.eq(1).text().trim() === 'Não Liberado'
   diagBloqAdapar     = $tds.eq(3).text().trim() === 'Não Liberado'
   ```

   Nenhuma tabela nova nem requisição extra necessária do lado Adapar — é o mesmo HTML que já
   é buscado hoje, só faltava ler 2 colunas que `parseRows` ignorava.

**As 3 perguntas estão fechadas. Não há mais bloqueio de informação — falta só escrever o
código.**

## Plano de implementação (as 3 perguntas já estão respondidas)

1. `lib/scraper.js → parseRows` — capturar `statusCultura` (`$tds.eq(1)`) e `statusAlvo`
   (`$tds.eq(3)`) em cada linha, junto do que já é extraído (`cultura`, `siagro`, `alvo`).
2. `routes/banco.js` — junto da query Oracle já existente (linha ~410-436), buscar também
   `RESTRICAOCULTURA` e `RESTRICAODIAG`, filtrando pelo agrotóxico do MA (`a.AGROTOXICOID`) +
   `UF = 'PR'` + `ATIVO = 'Sim'`. Montar um `Set<CULTURAID>` (de `RESTRICAOCULTURA`) e um
   `Set<CULTURAID:DIAGNOSTICOID>` (de `RESTRICAODIAG`) bloqueados no banco.
3. Reescrever a classificação de `corretos`/`errados`/`faltando` em `banco.js` (hoje linhas
   ~475-524) pra aplicar a fórmula validada, cruzando os 6 booleanos (2 de existência, 2 de
   bloqueio de cultura, 2 de bloqueio de diagnóstico) e produzindo as categorias de saída da
   seção seguinte, incluindo a causa (`categoria`) de cada erro.
4. Atualizar `docs/comparacao-oracle-celepar.md` pra documentar a nova lógica (o doc atual só
   descreve a comparação por nome de cultura + Jaccard, sem bloqueio).
5. Atualizar o frontend `teste-cccb/app.js` (`renderResultado`) pra exibir as novas categorias
   (a coluna `Categoria` na tabela "Errados" já foi trocada — falta o resto).

## Categorias de saída — decidido

Além de `corretos`/`faltando` (existência), o motor passa a distinguir:

- **Faltando bloquear cultura** (`faltCultura`)
- **Faltando bloquear diagnóstico** (`faltDiagnostico`)
- **Bloqueado / restrição OK** — o que antes cairia em `errados`/`faltando` mas bate com
  `RESTRICAOCULTURA`/`RESTRICAODIAG` ativa — mostrado à parte pra não sumir silenciosamente.
- **Erro**, dividido em 3 causas (cada uma com ação de correção diferente):
  1. **Erro de cultura** — `RESTRICAOCULTURA` ativa bloqueando algo que a Adapar libera.
  2. **Erro de diagnóstico** — `RESTRICAODIAG` ativa bloqueando algo que a Adapar libera.
  3. **Erro estrutural** — cultura nem existe na Adapar, mas o Oracle afirma algo mesmo assim
     (mais grave — dado órfão/contraditório).

### Frontend — já aplicado

`teste-cccb/app.js → renderResultado`: a tabela "Errados" trocou a coluna `Nome Comum` por
`Categoria` (mostra qual das 3 causas acima gerou o erro daquela linha). O backend ainda não
devolve `r.categoria` — enquanto a Task de `banco.js` não for feita, a coluna aparece com `—`.

## Status: implementado

Todos os 5 passos do plano aplicados:

1. `lib/scraper.js → parseRows` — captura `culturaBloqueada`/`alvoBloqueado`.
2. `routes/banco.js → /cccb` — seleciona `AGROTOXICOID`, consulta `RESTRICAOCULTURA`/
   `RESTRICAODIAG`, monta os Sets de bloqueio.
3. Classificação reescrita (`classificarOracleRow` + loop de `celeparToCheck`) produzindo
   `corretos`, `errados` (com `categoria`), `bloqueados`, `faltando`, `faltandoBloquearCultura`,
   `faltandoBloquearDiagnostico`.
4. `docs/comparacao-oracle-celepar.md` documentado com a tabela de classificação.
5. `teste-cccb/app.js` renderiza as 3 categorias novas + a coluna `Categoria` em Errados.

**Não testado contra o Oracle real** (esta máquina não tem acesso — só o servidor remoto tem).
Validar depois do deploy: `git pull` + build + `pm2 reload CeleparApp` no servidor, depois rodar
o CCCB num MA conhecido (ex.: um dos MAs do ticket, ou qualquer produto com cultura restrita) e
conferir se `bloqueados`/`faltandoBloquearCultura`/`faltandoBloquearDiagnostico` fazem sentido.
