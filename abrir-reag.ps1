# Abre o REAG local (Reag3C.exe) na ordem certa, idempotente -- ver docs/gotchas.md pro
# porquê de cada passo (achado em 21/08/2026: faltava o VsScktSrvr.exe, socket broker do
# DataSnap, que gotchas.md não documentava antes).
#
# Idempotente: roda de novo a qualquer momento, sem medo -- só inicia o que não está rodando,
# nunca derruba processo já de pé (principal lição do incidente que gerou este script: eu tinha
# derrubado o Reag3C sem necessidade e sem avisar direito).
#
# NUNCA faz login sozinho -- login em ViasoftServerAgro é interação de tela com credencial,
# fora do que devo automatizar. Se não estiver logado, o script para e avisa.

$ErrorActionPreference = 'Stop'

function Escrever($msg) { Write-Host $msg }

# 1. Firebird
$fb = Get-Service -Name 'FirebirdServerDefaultInstance' -ErrorAction SilentlyContinue
if (-not $fb) {
    Escrever "[ERRO] Serviço FirebirdServerDefaultInstance não encontrado nesta máquina."
    exit 1
}
if ($fb.Status -ne 'Running') {
    Escrever "Firebird parado -- iniciando serviço..."
    Start-Service -Name 'FirebirdServerDefaultInstance'
} else {
    Escrever "[ok] Firebird já rodando."
}

# 2. Socket Connection Broker (VsScktSrvr.exe) -- escuta a porta 211/311 de verdade, sem
# precisar de login nenhum, sobe e já fica pronto.
$broker = Get-Process -Name 'VsScktSrvr' -ErrorAction SilentlyContinue
if (-not $broker) {
    Escrever "Socket broker (VsScktSrvr) não estava rodando -- iniciando..."
    Start-Process 'C:\Viasoft\Server\VsScktSrvr.exe'
    Start-Sleep -Seconds 2
} else {
    Escrever "[ok] Socket broker (VsScktSrvr) já rodando."
}

# 3. Servidor de aplicações (ViasoftServerAgro.exe) -- precisa de LOGIN MANUAL na janela.
# Detecta pelo título da janela: "Não Logado" = ainda não logou.
$appServer = Get-Process -Name 'ViasoftServerAgro' -ErrorAction SilentlyContinue
if (-not $appServer) {
    Escrever "Servidor de aplicações não estava rodando -- iniciando..."
    Start-Process 'C:\Viasoft\Server\Agro\ViasoftServerAgro.exe'
    Escrever ""
    Escrever "PRECISA DE VOCÊ: loga na janela 'Viasoft Server Agro' que acabou de abrir, depois roda este script de novo."
    exit 0
}
if ($appServer.MainWindowTitle -like '*Não Logado*') {
    Escrever ""
    Escrever "[ok] Servidor de aplicações já está aberto, mas ainda SEM LOGIN."
    Escrever "PRECISA DE VOCÊ: loga na janela 'Viasoft Server Agro: Não Logado', depois roda este script de novo."
    exit 0
}
Escrever "[ok] Servidor de aplicações logado como $($appServer.MainWindowTitle -replace 'Viasoft Server Agro: ', '')."

# 4. Cliente (Reag3C.exe) -- só abre se não estiver aberto ainda (idempotente de verdade).
$cliente = Get-Process -Name 'Reag3C' -ErrorAction SilentlyContinue
if ($cliente) {
    Escrever "[ok] Reag3C já está aberto (janela: $($cliente.MainWindowTitle)) -- nada a fazer."
} else {
    Escrever "Abrindo Reag3C..."
    Start-Process 'C:\Viasoft\Client\Agro\Reag3C.exe'
}
