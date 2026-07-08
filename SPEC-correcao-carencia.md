# Correção de carência (RECEITPADRAO.CARENCIA) — design

## Problema

Depois de cadastrar um produto completo no ERP (Reag — Receituário Agronômico), é comum a carência
(intervalo de segurança) vir errada ou incompleta por cultura. Hoje a correção é feita cultura por
cultura, produto por produto, direto no sistema externo — processo lento e repetitivo mesmo sendo
mais rápido que corrigir durante o cadastro original.

Objetivo: uma tela neste app onde, dado um produto (MA) já selecionado no contexto global, apareçam
todas as culturas já cadastradas para ele; ao digitar um novo valor de carência para uma cultura e
apertar Enter, o valor é aplicado em todas as linhas ativas de `RECEITPADRAO` daquela combinação
MA+cultura de uma vez.

## Fora de escopo

- Qualquer extração automática de PDF/bula (o valor é lido pela pessoa direto na bula e digitado).
- Processamento em lote de múltiplos produtos.
- Tela de confirmação/modal antes de gravar — Enter grava direto, como no fluxo atual do usuário.
- Migrar `banco.js` para a nova camada de service/db (fora deste escopo; ver "Dívida técnica").

## Ambiente de teste local (Firebird)

Existe uma instalação local do Viasoft Agro (ERP Delphi + Firebird) em `C:\Viasoft`. O banco
`C:\Viasoft\Dados\SAFRAS.FDB` tem o mesmo schema relevante do Oracle de produção (REAG):

- `RECEITPADRAO`: `RECPADRAOID`, `CULTURAID`, `DIAGNOSTICOID`, `CARENCIA` (varchar 30), `ATIVO` (varchar 1, `S`/`N`)
- `AGROTOXICO`: `REGISTROMA` (varchar 15), `RECPADRAOID`

Confirmado via `isql` conectando direto no motor Firebird (SYSDBA/masterkey, serviço
`FirebirdServerDefaultInstance` já rodando, TCP 3050 aberto). MA real disponível para testes:
`16712` ("CREDIT", 1336 linhas ativas em `RECEITPADRAO`).

Este ambiente é usado para desenvolver e validar a feature de ponta a ponta antes de apontar para o
Oracle de produção. A view e a rota são construídas de verdade agora, contra Firebird — não é um
script descartável.

## Arquitetura

```
CarenciaView.jsx (frontend)
        │
        ▼
routes/carencia.js        — HTTP: parse do request, validação, chama o service, responde JSON
        │
        ▼
lib/carenciaService.js    — regra de negócio: monta as queries, decide "divergente",
        │                    grava o log de auditoria
        ▼
lib/db/index.js           — escolhe o client ativo via DB_BACKEND=firebird|oracle
        │
        ▼
lib/db/firebirdClient.js  — implementação Firebird (node-firebird), traduz binds :nome → posicional
lib/db/oracleClient.js    — implementação Oracle (futura — ver "Dívida técnica")
```

Cada camada tem uma responsabilidade: a rota não sabe nada de SQL, o service não sabe nada de HTTP
nem de qual banco está por trás, o client sabe falar com um banco específico e nada além disso.
Trocar de Firebird para Oracle depois é mudar `DB_BACKEND` e ativar `oracleClient.js` — nem a rota
nem o service mudam.

### `lib/db/index.js`

```js
function getClient() {
  return process.env.DB_BACKEND === 'oracle'
    ? require('./oracleClient')
    : require('./firebirdClient')
}
```

Ambos os clients expõem a mesma interface: `query(sql, binds) → rows[]` e
`execute(sql, binds) → { rowsAffected }`, sempre usando binds nomeados no estilo Oracle (`:ma`,
`:culturaid`). `firebirdClient.js` faz a tradução `:nome → ?` internamente (parse simples do texto
SQL, extrai os nomes na ordem em que aparecem, monta o array de valores).

### `lib/config.js` (novo trecho)

```js
FIREBIRD_PATH: process.env.FIREBIRD_PATH || 'C:\\Viasoft\\Dados\\SAFRAS.FDB',
FIREBIRD_HOST: process.env.FIREBIRD_HOST || '127.0.0.1',
FIREBIRD_PORT: process.env.FIREBIRD_PORT || 3050,
FIREBIRD_USER: process.env.FIREBIRD_USER || 'SYSDBA',
FIREBIRD_PASSWORD: process.env.FIREBIRD_PASSWORD || 'masterkey',
```

São defaults públicos do Firebird para uma base de teste local, não segredo de produção — por isso
podem ficar hardcoded com override por env, ao contrário das credenciais Oracle (que ficam só no
NSSM do servidor).

### `lib/carenciaService.js`

```js
async function listarCulturas(ma) { ... }
// SELECT DISTINCT c.CULTURAID, c.NOME, r.CARENCIA
// FROM RECEITPADRAO r
// JOIN CULTURA c ON c.CULTURAID = r.CULTURAID
// JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
// WHERE a.REGISTROMA = :ma AND r.ATIVO = 'S'
//
// Se uma cultura tiver mais de um valor de CARENCIA entre os diagnósticos (dado
// pré-existente inconsistente), retorna carencia: null, divergente: true.

async function atualizarCarencia({ ma, culturaid, valor, usuario }) { ... }
// 1. Lê o(s) valor(es) atual(is) para log (mesma query de cima, filtrando por culturaid)
// 2. UPDATE RECEITPADRAO SET CARENCIA = :valor
//    WHERE CULTURAID = :culturaid AND ATIVO = 'S'
//      AND RECPADRAOID IN (
//        SELECT r.RECPADRAOID FROM RECEITPADRAO r
//        JOIN AGROTOXICO a ON a.RECPADRAOID = r.RECPADRAOID
//        WHERE a.REGISTROMA = :ma
//      )
// 3. Grava em carencia_log (sqlite local): ma, culturaid, valor_anterior, valor_novo, usuario, timestamp
// 4. Retorna { linhasAfetadas }
```

Só toca linhas com `ATIVO = 'S'` — receitas inativas/históricas não são alteradas.

### `routes/carencia.js`

```
GET /api/carencia/culturas?ma=X        → carenciaService.listarCulturas(ma)
PUT /api/carencia   (requireAdmin)     → { ma, culturaid, valor } → carenciaService.atualizarCarencia(...)
```

### Log de auditoria

Tabela nova no sqlite já usado pelo app (`backend/agrofit_ids.db`, via `backend/db.js` — mesma
conexão que `routes/banco.js` já importa como `agrofitDb`; não cria arquivo `.db` novo):
`carencia_log(id, ma, culturaid, valor_anterior, valor_novo, usuario, criado_em)`.
Grava toda escrita, sem bloquear o fluxo — é rastro para auditoria, não uma trava de segurança.

## Frontend — `CarenciaView.jsx`

- Usa `params.ma` do contexto global (mesmo padrão de `ExtrairView`, `BulaView`).
- Ao montar/trocar de MA, chama `GET /api/carencia/culturas`.
- Lista as culturas; clique numa linha abre um input inline pré-preenchido com o valor atual
  (ou placeholder "valores distintos" quando `divergente: true`).
- Enter no input chama `PUT /api/carencia` e atualiza a linha na tela com o retorno — sem modal de
  confirmação.
- Novas funções em `frontend/src/api.js`: `carenciaCulturas(ma)`, `carenciaAtualizar({ma, culturaid, valor})`.

## Dívida técnica registrada (não faz parte deste trabalho)

Quando `oracleClient.js` for implementado (na hora de apontar para produção), ele **deve reusar** a
mesma lógica de conexão que `routes/banco.js → oracleConn()` já usa hoje, extraída para um helper
compartilhado (ex: `lib/oracleConnection.js`), em vez de criar uma segunda implementação de
conexão/pool Oracle independente. `banco.js` continua usando as credenciais de leitura
(`ORACLE_USER`/`ORACLE_PASSWORD`); a escrita usa um usuário novo, com grant de escrita, via
`ORACLE_WRITE_USER`/`ORACLE_WRITE_PASSWORD` (variáveis novas a criar no NSSM do servidor). Se essa
extração não for feita nesse momento, o app passa a ter duas implementações de conexão Oracle
coexistindo — a duplicação que o projeto evita por princípio.

## Dependências novas

- `node-firebird` (dependency de produção do backend, já que a rota real vai usá-la enquanto
  `DB_BACKEND=firebird`; some quando o backend migrar de vez pra Oracle, mas até lá é parte do
  caminho principal, não só de teste).
