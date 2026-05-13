# PM2 — Gerenciamento de processos

O servidor sobe automaticamente com o Windows via PM2. **Nunca usar `npm start`** com o PM2 rodando — causa `EADDRINUSE`.

```bash
pm2 list                  # status
pm2 restart celepar-be    # reiniciar backend após mudanças
pm2 restart celepar-fe    # reiniciar frontend
pm2 logs celepar-be       # logs em tempo real
```
