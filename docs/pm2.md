# PM2 — Desenvolvimento local

> **Produção também usa PM2** (processo `CeleparApp`, ver deploy em `../CLAUDE.md`) — NSSM entra
> só como serviço Windows que mantém o PM2 rodando no boot, e como armazenamento de secrets
> (`AppEnvironmentExtra`), não como gerenciador de processo substituto. `pm2 reload CeleparApp`,
> `pm2 logs CeleparApp`, `pm2 env 0` são os comandos reais usados no servidor de produção.

PM2 também roda backend + frontend em paralelo **localmente** durante desenvolvimento:

```bash
pm2 start ecosystem.config.cjs   # sobe celepar-be + celepar-fe
pm2 list                          # status
pm2 restart celepar-be            # reiniciar backend após mudanças
pm2 logs celepar-be               # logs em tempo real
pm2 stop all                      # parar tudo
```

Alternativa sem PM2 (raiz do projeto):
```bash
npm run dev   # usa concurrently
```
