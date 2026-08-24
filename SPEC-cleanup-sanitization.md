# Checklist de release público

> Único item pendente do antigo `SPEC-cleanup-sanitization.md` — Fases A (sanitização de
> segredos) e B (cleanup de código órfão) já foram concluídas. Isso aqui só falta se/quando
> decidir tornar o repositório público.

Antes de `git push` para repositório público:

- [ ] `.envs/` está em `.gitignore` e **não aparece** em `git status`
- [ ] `grep -r "140.238\|reag.vms\|gpl_scraper" . --exclude-dir=node_modules --exclude-dir=.git` retorna zero resultados
- [ ] Decisão tomada sobre histórico git (aceitar vs. purgar com `git filter-repo` — commits antigos de Jun 1 já têm IP/connection string expostos)
- [ ] `README.md` revisado para público (não expõe detalhes internos)
