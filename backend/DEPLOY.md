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
| `<APP_PATH>\backend\.env` | Credenciais (nunca vai pro git) |
| `<ORACLE_INSTANT_CLIENT_PATH>\` | Oracle Instant Client (necessário para conexão com o banco) |
| `<NSSM_EXE>` | Gerenciador do serviço |

## Arquivo .env

Não está no git — precisa ser criado manualmente na máquina remota:

```
PORT=3000

ORACLE_USER=...
ORACLE_PASSWORD=...
ORACLE_CONNECT_STRING=<ORACLE_CONNECT_STRING>
```

## Acesso

O site está disponível em `http://<IP_SERVIDOR>:3000` para qualquer máquina na rede interna.