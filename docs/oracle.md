# Oracle REAG

Banco interno da Viasoft com dados dos produtos.

- **Host**: `<ORACLE_CONNECT_STRING>`
- **Usuário da aplicação**: `<ORACLE_USER>`
- **Acesso**: só dentro da rede corporativa (não funciona remoto sem VPN)
- **Schema**: `ALTER SESSION SET CURRENT_SCHEMA = VIASOFT` (ver `backend/routes/banco.js`)
- **Tabelas usadas hoje**: `CULTURA`, `DIAGNOSTICO`, `RECEITPADRAO`, `AGROTOXICO`,
  `RESTRICAOCULTURA`, `RESTRICAODIAG` (as duas últimas guardam bloqueio de cultura/diagnóstico
  por produto — ver `docs/comparacao-oracle-celepar.md` pra como isso cruza com a Celepar)
