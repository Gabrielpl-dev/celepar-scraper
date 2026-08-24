# Preencher os 3 valores abaixo antes de rodar -- credenciais reais ficam no cofre de senhas
# Celepar / portal Agrofit-Embrapa, nunca neste arquivo (ver .envs/infra.md).
$pass   = "SUA_SENHA_AQUI"
$key    = "SUA_AGROFIT_KEY_AQUI"
$secret = "SEU_AGROFIT_SECRET_AQUI"

[Environment]::SetEnvironmentVariable("AGROFIT_USER",     "gabriel.pinheiro@viasoft.com.br",  "Machine")
[Environment]::SetEnvironmentVariable("AGROFIT_PASSWORD", $pass,                               "Machine")
[Environment]::SetEnvironmentVariable("AGROFIT_KEY",      $key,                                "Machine")
[Environment]::SetEnvironmentVariable("AGROFIT_SECRET",   $secret,                             "Machine")

Write-Host "Pronto! Agora rode: pm2 restart all"
