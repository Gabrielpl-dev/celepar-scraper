# PM2 — Desenvolvimento local

> **Produção usa NSSM** (`<NSSM_EXE> restart CeleparApp`), não PM2.

PM2 é opcional para rodar backend + frontend em paralelo **localmente**:

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
