# Wrapper pro Agendador de Tarefas -- garante cwd correto (pro dotenv achar .env) e
# acumula stdout+stderr num log, já que o Task Scheduler não captura console sozinho.
Set-Location $PSScriptRoot
$logDir = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'eval.log'

# Rotação simples -- sem isso, um harness "esquecível" rodando pra sempre vira log sem
# limite (mesma categoria do bug "cache sem TTL" que já travou o CeleparApp antes). Passou
# de 5MB, arquiva 1 cópia (.old, sobrescrita) e começa limpo -- não precisa de mais que isso
# pra um log de ~9 linhas a cada 10min.
if ((Test-Path $logFile) -and (Get-Item $logFile).Length -gt 5MB) {
  Move-Item -Path $logFile -Destination "$logFile.old" -Force
}

# *>> grava em UTF-16 (padrão do redirecionamento do PowerShell) -- ilegível em
# ferramentas que esperam UTF-8/ASCII (tail, grep etc). Out-File -Encoding utf8 força certo.
node src/index.js 2>&1 | Out-File -FilePath $logFile -Append -Encoding utf8
