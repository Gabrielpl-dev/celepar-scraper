# Comparação Oracle/Celepar (`/api/banco/cccb`)

## O que faz

Compara os alvos siagro de um produto no Oracle (RECEITPADRAO) contra o que está cadastrado no Celepar. Devolve três listas:

- `corretos` — alvos do Oracle presentes no Celepar
- `errados` — alvos do Oracle **ausentes** no Celepar
- `faltando` — alvos do Celepar **ausentes** no Oracle

## Fluxo de dados

```
Oracle RECEITPADRAO          Celepar (scraping HTML)
       │                            │
       ▼                            ▼
celeparNormFor(cultura, id)    norm(r.cultura)
  └─ lookup SQLite culturas         │
     (celepar_nome) ou norm         ▼
       │                      celeparSets[key] = Set<siagro>
       ▼                      celeparRows[key] = rows[]
  resolveKey(cn)
  └─ exact match em celeparSets?  → usa direto
     senão → Jaccard ≥ 0.8?       → usa melhor match
     senão → cn sem match         → cSet = Set vazio → tudo vai pra errados
       │
       ▼
  cSet.has(String(r.SIAGROALV))
  └─ true  → corretos
     false → errados
```

## Funções críticas (`banco.js` ~linha 388)

### `norm`
Importada de `lib/scraper.js`. **Não faz nada além de `String(s || '')`** — não normaliza acentos, não faz lowercase. Usada como chave de índice.

### `tokenize`
```js
const tokenize = s => {
  const n = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return new Set(n.replace(/[^a-z0-9 ]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(Boolean))
}
```
Faz NFD + remove combining marks + lowercase **antes** de filtrar. Hífen e pontuação viram espaço (não vazio) para manter tokens separados.

### `jaccard(a, b)`
Similaridade de conjuntos de palavras. Limiar em `resolveKey`: **≥ 0.8**.

### `resolveKey(cn)`
Tenta match exato primeiro. Se falhar, faz Jaccard contra todos os keys de `celeparSets`. Retorna o melhor acima do limiar, ou `cn` sem match (→ Set vazio).

## Armadilhas conhecidas

| Problema | Sintoma | Causa |
|---|---|---|
| `norm` não normaliza | chaves com case/acento diferente não batem no exact match | `norm` é identidade |
| `tokenize` sem NFD | Jaccard = 0 para strings uppercase ou acentuadas | letras não-`[a-z]` removidas antes de comparar |
| Hífen merge tokens | "FEIJÃO-CAUPI" vira `["feijãocaupi"]` | substituir por `''` em vez de `' '` |
| `resolveKey` retorna `cn` sem match | `cSet` vazio → siagro válido vai pra `errados` | cultura Oracle sem par no Celepar |

## Como debugar um falso-errado

1. Confirma que o siagro existe no Celepar para aquela cultura (script 02 — Buscar por SIAGRO)
2. Compara o nome da cultura Oracle (`r.CULTURA`) com o nome no Celepar (`r.cultura` do scraper)
3. Testa `tokenize` nos dois nomes no console:
   ```js
   const tokenize = s => { const n = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return new Set(n.replace(/[^a-z0-9 ]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(Boolean)) }
   tokenize("FEIJÃO-CAUPI")   // deve dar {"feijao", "caupi"}
   tokenize("Feijão Caupi")   // deve dar {"feijao", "caupi"}
   ```
4. Se Jaccard < 0.8, provavelmente falta mapeamento no SQLite (`culturas.celepar_nome` para o `culturaid`)

## SQLite `culturas`

```sql
SELECT culturaid, nome, celepar_nome FROM culturas WHERE culturaid = ?
```

Se `celepar_nome` estiver nulo, `celeparNormFor` usa o nome Oracle direto. Adicionar o mapeamento correto resolve sem tocar no código.

## Restrição de cultura/diagnóstico (RESTRICAOCULTURA/RESTRICAODIAG)

Design completo em `SPEC-restricao-cultura-cccb.md`. Resumo: uma cultura/diagnóstico "errado" ou
"faltando" pode na verdade estar corretamente bloqueado de propósito — o motor cruza 3 fontes:

- **Adapar** (`lib/scraper.js → parseRows`): cada linha da página `listar.asp` tem 4 `<td>`s —
  Cultura, **Status Cultura**, Alvo, **Status Alvo**. `Não Liberado` vem marcado com
  `<font color="red">`; `Liberado` não tem cor. Capturado como `culturaBloqueada`/`alvoBloqueado`
  em cada linha retornada por `parseRows`.
- **Oracle** (`routes/banco.js → /cccb`): `RESTRICAOCULTURA`/`RESTRICAODIAG`
  (`IDAGROTOXICO`+`CULTURAID`[+`DIAGNOSTICOID`]+`UF='PR'`+`ATIVO='S'`) — bloqueio registrado
  no banco. `IDAGROTOXICO` vem de `AGROTOXICO.ITEM`, já selecionado na query principal.

Classificação (função `classificarOracleRow` em `banco.js`):

| Situação | Categoria |
|---|---|
| Cultura não existe na Adapar pra esse produto | `errados` (categoria `estrutural`) |
| Banco bloqueou cultura que a Adapar libera | `errados` (categoria `cultura`) |
| Banco bloqueou diagnóstico que a Adapar libera | `errados` (categoria `diagnostico`) |
| Alvo não existe na Adapar pra essa cultura, sem bloqueio no banco | `errados` (categoria `diagnostico`) |
| Bloqueado nos dois lados de forma consistente | `bloqueados` (não é erro) |
| Nenhum bloqueio, alvo bate | `corretos` |
| Adapar bloqueia a cultura inteira, banco ainda não | `faltandoBloquearCultura` |
| Adapar bloqueia só o diagnóstico, banco ainda não (e a cultura em si não está pendente) | `faltandoBloquearDiagnostico` |

`faltando` (existência pura — Celepar tem, Oracle não tem receita ativa nenhuma) continua
igual a antes, sem relação com bloqueio.
