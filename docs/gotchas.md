# Gotchas

**Espaços nas URLs do Agrofit**
`URLSearchParams` codifica espaços como `+`, mas o Agrofit retorna 503. Sempre usar `.replace(/\+/g, '%20')` nas URLs enviadas ao Agrofit. Aplicado em `routes/agrofit.js`.

**Encoding Celepar**
O site serve `windows-1252`. Problemas com acentos começam aqui. Ver `lib/scraper.js` → `fetchPage`.

**Build do frontend**
Após editar `frontend/src/`, buildar antes de fazer push:
```bash
cd frontend && npm run build
```
O build vai para `backend/public/` que o Express serve como static. No servidor, após `git pull`, rodar o build e reiniciar o NSSM.

**Credenciais NSSM vs Registry do Windows**
`NSSM AppEnvironmentExtra` tem **precedência** sobre variáveis do registry do sistema. Se atualizar o registry e o servidor não pegar as novas credenciais, é porque o NSSM tem cópias antigas. Atualizar via:
```
<NSSM_EXE> set CeleparApp AppEnvironmentExtra "AGROFIT_KEY=... AGROFIT_SECRET=..."
```

**PDF Agrofit via iframe**
Iframes abrem URLs diretamente no browser sem enviar o header `Authorization`. Por isso `/api/agrofit-pdf` é público — fica em `routes/agrofit-public.js`, registrado antes do `requireAuth`.

**Como abrir o REAG local (Reag3C.exe)**
Script pronto, idempotente, na raiz do repo -- roda a qualquer momento sem medo (só inicia o
que não está rodando, nunca derruba nada já aberto):
```powershell
powershell -ExecutionPolicy Bypass -File abrir-reag.ps1
```
Se parar pedindo login, é a única parte que não dá pra automatizar (interação de tela com
credencial) -- loga na janela "Viasoft Server Agro" e roda o script de novo.

Detalhe de por trás (só se precisar diagnosticar na mão): são **3** processos separados, não 2
como a versão anterior desta nota dizia -- faltava a peça que realmente escuta a porta (achado
em 21/08/2026, depois de eu abrir só os 2 documentados e o Reag3C travar com erro de socket
mesmo assim). Ordem certa:

1. Confirmar que o serviço do Firebird está rodando (normalmente já está, é `Automatic`):
   ```powershell
   Get-Service -Name "FirebirdServerDefaultInstance"
   ```
2. Abrir o **Socket Connection Broker** (`C:\Viasoft\Server\VsScktSrvr.exe` -- variante da
   Viasoft do `ScktSrvr.exe` clássico da Embarcadero/Borland, usado no modelo DataSnap/MIDAS
   de 3 camadas: cliente conecta no broker, o broker repassa pro servidor de aplicação
   registrado nele). **É ele que escuta a porta 211** (e também 311), não o
   `ViasoftServerAgro.exe` -- confirmado com `Get-NetTCPConnection -OwningProcess <pid>` logo
   depois de abrir. Não é serviço do Windows, não sobe sozinho -- precisa abrir manualmente
   toda vez, sem interação de tela (abre e já fica escutando):
   ```
   C:\Viasoft\Server\VsScktSrvr.exe
   ```
3. Abrir o **servidor de aplicações** (também não é serviço do Windows):
   ```
   C:\Viasoft\Server\Agro\ViasoftServerAgro.exe
   ```
   A janela dele abre mostrando **"Não Logado"** -- precisa logar manualmente nessa janela
   (interação de tela, não dá pra automatizar por aqui). É esse login que registra o servidor
   de aplicação no broker do passo 2 (config em `C:\Viasoft\Client\Agro\dbxconnections.ini`,
   seção `[DataSnapCONNECTION]`, `port=211` -- porta do broker, não do próprio
   ViasoftServerAgro).
4. Só então abrir o cliente:
   ```
   C:\Viasoft\Client\Agro\Reag3C.exe
   ```

Se pular o passo 2 (broker não rodando) OU pular/não completar o login do passo 3, o REAG abre
mas trava com erro de socket: *"Ocorreu uma falha na comunicação com o Servidor de Aplicações:
127.0.0.1! ... recusou ativamente (10061)"*.

Log de debug do servidor de aplicações, se precisar diagnosticar mais: `C:\Viasoft\ViaserverDebug.txt` (nível configurado em `C:\Viasoft\Server\Agro\ViasoftServerAgro.conf`).
