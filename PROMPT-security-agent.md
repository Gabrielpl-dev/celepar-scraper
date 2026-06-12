# Prompt — Agente de Correções de Segurança

Leia e execute o arquivo `SPEC-security-fixes.md` na raiz do projeto.

Execute as tasks na ordem definida na spec (Task 1 → 8), que já está ordenada do problema mais tranquilo para o mais crítico.

**Regra de parada obrigatória:**

- Após concluir a **Task 3** (último problema de nível Médio): pare, reporte ao usuário quais tasks foram concluídas e aguarde autorização para continuar.
- Após concluir a **Task 5** (último problema de nível Alto): pare, reporte ao usuário e aguarde autorização para continuar.
- Tasks 7 e 8 são nível Crítico. A **Task 7 tem um passo manual no servidor** que deve ser confirmado pelo usuário antes de você commitar — leia o aviso ⚠️ na spec com atenção.

Em cada parada, informe:
- Quais tasks foram executadas e se tiveram sucesso
- Qual é a próxima task e o risco que ela representa
- O que o usuário precisa fazer (se houver ação manual)
