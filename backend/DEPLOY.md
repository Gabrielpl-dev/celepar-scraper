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
| `C:\celepar_app\backend\.env` | Credenciais (nunca vai pro git) |
| `C:\oracle\instantclient_21_15\` | Oracle Instant Client (necessário para conexão com o banco) |
| `C:\nssm\nssm-2.24\win64\nssm.exe` | Gerenciador do serviço |

## Arquivo .env

Não está no git — precisa ser criado manualmente na máquina remota:

```
PORT=3000

ORACLE_USER=...
ORACLE_PASSWORD=...
ORACLE_CONNECT_STRING=reag.vms.com.br:1521/reag

JWT_SECRET=<gerar com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
```

> **JWT_SECRET** é obrigatório para autenticação. Sem ele o login retorna 401.

## Acesso

O site está disponível em `http://140.238.238.172:3000` para qualquer máquina na rede interna.