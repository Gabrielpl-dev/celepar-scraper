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
| DESCRICAO       |      | Nome do diagnóstico    |

---

## Relacionamentos

```
RECEITPADRAO
  ├── CULTURAID     → CULTURA.CULTURAID
  └── DIAGNOSTICOID → DIAGNOSTICO.DIAGNOSTICOID
```
