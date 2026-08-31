# Wrapper pro Agendador de Tarefas -- garante cwd correto (pro dotenv achar .env) e
# acumula stdout+stderr num log, já que o Task Scheduler não captura console sozinho.
Set-Location $PSScriptRoot
$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'eval.log'
node src/index.js *>> $logFile
