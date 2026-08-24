# Deploy — Máquina Remota

> Valores de infraestrutura (IP, paths, connection string) estão em `.envs/infra.md` (arquivo local, não versionado).

## Serviço Windows (PM2)

O servidor roda via PM2 — sobe automaticamente com a máquina via `pm2-windows-startup`.

Todos os comandos abaixo precisam de **PowerShell como administrador**.

```powershell
# Verificar status
pm2 status

# Reiniciar (após atualizar o código)
pm2 restart CeleparApp

# Parar
pm2 stop CeleparApp

# Iniciar
pm2 start CeleparApp

# Ver logs
pm2 logs CeleparApp --lines 50 --nostream
```

## Atualizar o código

```powershell
cd <APP_PATH>
git pull
cd backend && npm install
cd ../frontend && npm run build   # obrigatório se algo em frontend/ mudou -- compila pra backend/public/
cd ..
pm2 reload CeleparApp             # reload = zero-downtime, preferir a restart
```

## Estrutura

| Caminho | O que é |
|---|---|
| `<APP_PATH>\` | Repositório git |
| `<APP_PATH>\backend\.env` | Todos os secrets (JWT_SECRET, ORACLE_*, AGROFIT_*, GPL_SCRAPER_PASSWORD, etc.) |
| `<ORACLE_INSTANT_CLIENT_PATH>\` | Oracle Instant Client (necessário para conexão com o banco) |
| PM2 | Gerenciador do serviço (`npm install -g pm2 pm2-windows-startup`) |

## Arquivo .env

Fonte de verdade pra todos os secrets (gitignored, nunca commitado). Lista completa de
variáveis necessárias em `backend/.env.example` — copiar pra `.env` e preencher com valor real
(cofre de senhas Celepar / portal Agrofit-Embrapa / `pm2 env 0` no servidor atual).

Histórico: até 24/08 os secrets viviam só no registry do Windows via NSSM `AppEnvironmentExtra`
(`SetEnvironmentVariable ... "Machine"`), com `.env` tendo só `PORT=3000`. Migrado pra `.env`
nessa data — os dois mecanismos podem conviver sem conflito (`dotenv` nunca sobrescreve uma
variável de ambiente já setada), mas `.env` é o caminho documentado e atualizado a partir de agora.

```powershell
# Reiniciar pra aplicar depois de editar .env
pm2 reload CeleparApp
```

## Acesso

O site está disponível em `http://<IP_SERVIDOR>:3000` para qualquer máquina na rede interna.

## Roles

| Role | Acesso |
|---|---|
| `admin` | Tudo — incluindo `/banco/` (explorador Oracle) |
| `viewer` | Só o app React em `/` |

O usuário `GPL_SCRAPER` sempre entra como `admin`. Para promover outro usuário a admin:

```
POST /api/auth/promote
Authorization: Bearer <token_admin>
{ "username": "<usuario>" }
```
