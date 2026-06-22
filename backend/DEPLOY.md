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
pm2 restart CeleparApp
```

## Estrutura

| Caminho | O que é |
|---|---|
| `<APP_PATH>\` | Repositório git |
| `<APP_PATH>\backend\.env` | Só a porta (segredos ficam no registry) |
| `<ORACLE_INSTANT_CLIENT_PATH>\` | Oracle Instant Client (necessário para conexão com o banco) |
| PM2 | Gerenciador do serviço (`npm install -g pm2 pm2-windows-startup`) |

## Arquivo .env

Contém **apenas a porta**. Os segredos ficam no registry do Windows (escopo Machine), não em arquivo.

```
PORT=3000
```

## Configurar segredos (primeira vez ou troca de credenciais)

PowerShell como admin:

```powershell
# Gerar JWT_SECRET
$secret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Setar no registry (escopo sistema — requer admin)
[Environment]::SetEnvironmentVariable("ORACLE_USER",          "<ORACLE_USER>",               "Machine")
[Environment]::SetEnvironmentVariable("ORACLE_PASSWORD",       "<senha>",                   "Machine")
[Environment]::SetEnvironmentVariable("ORACLE_CONNECT_STRING", "<ORACLE_CONNECT_STRING>", "Machine")
[Environment]::SetEnvironmentVariable("JWT_SECRET",            $secret,                     "Machine")

# Reiniciar para aplicar
pm2 restart CeleparApp
```

> Os valores ficam em `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment` e são lidos pelo Node.js via `process.env` normalmente.

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
