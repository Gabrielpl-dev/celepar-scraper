# Wrapper pro Agendador de Tarefas -- garante cwd correto (pro dotenv achar .env) e
# acumula stdout+stderr num log, já que o Task Scheduler não captura console sozinho.
Set-Location $PSScriptRoot
$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'eval.log'
# *>> grava em UTF-16 (padrão do redirecionamento do PowerShell) -- ilegível em
# ferramentas que esperam UTF-8/ASCII (tail, grep etc). Out-File -Encoding utf8 força certo.
node src/index.js 2>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
