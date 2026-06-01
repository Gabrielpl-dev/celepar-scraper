# Deploy — Máquina Remota (140.238.238.172)

## Serviço Windows (NSSM)

O servidor roda como serviço `CeleparApp` — sobe automaticamente com a máquina e não depende de nenhum usuário logado.

Todos os comandos abaixo precisam de **PowerShell como administrador**.

```powershell
# Verificar status
C:\nssm\nssm-2.24\win64\nssm.exe status CeleparApp

# Reiniciar (após atualizar o código)
C:\nssm\nssm-2.24\win64\nssm.exe restart CeleparApp

# Parar
C:\nssm\nssm-2.24\win64\nssm.exe stop CeleparApp

# Iniciar
C:\nssm\nssm-2.24\win64\nssm.exe start CeleparApp
```

## Atualizar o código

```powershell
cd C:\celepar_app
git pull
C:\nssm\nssm-2.24\win64\nssm.exe restart CeleparApp
```

## Estrutura

| Caminho | O que é |
|---|---|
| `C:\celepar_app\` | Repositório git |
| `C:\celepar_app\backend\.env` | Só a porta (segredos ficam no registry) |
| `C:\oracle\instantclient_21_15\` | Oracle Instant Client (necessário para conexão com o banco) |
| `C:\nssm\nssm-2.24\win64\nssm.exe` | Gerenciador do serviço |

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
[Environment]::SetEnvironmentVariable("ORACLE_USER",          "gpl_scraper",               "Machine")
[Environment]::SetEnvironmentVariable("ORACLE_PASSWORD",       "<senha>",                   "Machine")
[Environment]::SetEnvironmentVariable("ORACLE_CONNECT_STRING", "reag.vms.com.br:1521/reag", "Machine")
[Environment]::SetEnvironmentVariable("JWT_SECRET",            $secret,                     "Machine")

# Reiniciar para aplicar
C:\nssm\nssm-2.24\win64\nssm.exe restart CeleparApp
```

> Os valores ficam em `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment` e são lidos pelo Node.js via `process.env` normalmente.

## Acesso

O site está disponível em `http://140.238.238.172:3000` para qualquer máquina na rede interna.

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
