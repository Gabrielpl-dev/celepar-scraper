# Schema VIASOFT — Tabelas principais

## RECEITPADRAO
Receita padrão (produto agrotóxico).

| Coluna         | Tipo | Descrição                          |
|----------------|------|------------------------------------|
| RECPADRAOID    | PK   | Identificador da receita           |
| DESCRICAO      |      | Nome do produto                    |
| CULTURAID      | FK   | → CULTURA.CULTURAID                |
| DIAGNOSTICOID  | FK   | → DIAGNOSTICO.DIAGNOSTICOID        |

---

## CULTURA
Culturas agrícolas.

| Coluna     | Tipo | Descrição           |
|------------|------|---------------------|
| CULTURAID  | PK   | Identificador       |
| NOME       |      | Nome da cultura     |

---

## DIAGNOSTICO
Diagnósticos, pragas e doenças.

| Coluna          | Tipo | Descrição              |
|-----------------|------|------------------------|
| DIAGNOSTICOID   | PK   | Identificador          |
| SIAGROALV       |      | Código SIAGRO do alvo  |
| DESCRICAO       |      | Nome do diagnóstico    |
| NOMECIENTIFICO  |      | Nome científico        |

---

## AGROTOXICO
Produtos agrotóxicos registrados.

| Coluna        | Tipo | Descrição               |
|---------------|------|-------------------------|
| AGROTOXICOID  | PK   | Identificador do produto — referenciado por `RESTRICAOCULTURA.IDAGROTOXICO` e `RESTRICAODIAG.IDAGROTOXICO` |
| NOME          |      | Nome do produto         |
| REGISTROMA    |      | Número de registro MA   |
| ITEM          |      | Item do produto         |

---

## RESTRICAOCULTURA
Bloqueio/restrição de um produto pra uma cultura inteira, por UF. Usada pelo CCCB pra saber
que uma cultura "errada"/"faltando" na comparação Oracle × Celepar na verdade está no estado
esperado (produto bloqueado de propósito pra essa cultura).

| Coluna        | Tipo | Descrição                                    |
|---------------|------|-----------------------------------------------|
| IDAGROTOXICO  | FK   | → AGROTOXICO.AGROTOXICOID                    |
| CULTURAID     | FK   | → CULTURA.CULTURAID                          |
| UF            | TEXT | Unidade federativa do bloqueio (ex: `'PR'`)   |
| ATIVO         | TEXT | Flag de bloqueio ativo — valor literal `'Sim'` |

Só vale pro CCCB quando `UF = 'PR'` (a Adapar é o órgão do Paraná; bloqueio de outro estado não
tem correspondência na comparação com a Celepar-PR).

---

## RESTRICAODIAG
Mesma ideia de `RESTRICAOCULTURA`, mas na granularidade de um diagnóstico/alvo específico dentro
da cultura — permite bloquear só um diagnóstico sem bloquear a cultura inteira.

| Coluna         | Tipo | Descrição                                    |
|----------------|------|-----------------------------------------------|
| IDAGROTOXICO   | FK   | → AGROTOXICO.AGROTOXICOID                    |
| CULTURAID      | FK   | → CULTURA.CULTURAID                          |
| DIAGNOSTICOID  | FK   | → DIAGNOSTICO.DIAGNOSTICOID                  |
| UF             | TEXT | Unidade federativa do bloqueio (ex: `'PR'`)   |
| ATIVO          | TEXT | Flag de bloqueio ativo — valor literal `'Sim'` |

Mesma regra de `UF = 'PR'` do `RESTRICAOCULTURA`.

---

## Relacionamentos

```
RECEITPADRAO
  ├── CULTURAID     → CULTURA.CULTURAID
  └── DIAGNOSTICOID → DIAGNOSTICO.DIAGNOSTICOID

RESTRICAOCULTURA
  ├── IDAGROTOXICO  → AGROTOXICO.AGROTOXICOID
  └── CULTURAID     → CULTURA.CULTURAID

RESTRICAODIAG
  ├── IDAGROTOXICO  → AGROTOXICO.AGROTOXICOID
  ├── CULTURAID     → CULTURA.CULTURAID
  └── DIAGNOSTICOID → DIAGNOSTICO.DIAGNOSTICOID
```
