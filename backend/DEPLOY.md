# Deploy — Máquina Remota (<IP_SERVIDOR>)

## Serviço Windows (NSSM)

O servidor roda como serviço `CeleparApp` — sobe automaticamente com a máquina e não depende de nenhum usuário logado.

Todos os comandos abaixo precisam de **PowerShell como administrador**.

```powershell
# Verificar status
<NSSM_EXE> status CeleparApp

# Reiniciar (após atualizar o código)
<NSSM_EXE> restart CeleparApp

# Parar
<NSSM_EXE> stop CeleparApp

# Iniciar
<NSSM_EXE> start CeleparApp
```

## Atualizar o código

```powershell
cd C:\celepar_app
git pull
<NSSM_EXE> restart CeleparApp
```

## Estrutura

| Caminho | O que é |
|---|---|
| `<APP_PATH>\` | Repositório git |
| `<APP_PATH>\backend\.env` | Só a porta (segredos ficam no registry) |
| `<ORACLE_INSTANT_CLIENT_PATH>\` | Oracle Instant Client (necessário para conexão com o banco) |
| `<NSSM_EXE>` | Gerenciador do serviço |

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
<NSSM_EXE> restart CeleparApp
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
