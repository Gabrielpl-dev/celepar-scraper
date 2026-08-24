$pass = "SUA_SENHA_AQUI"

[Environment]::SetEnvironmentVariable("AGROFIT_USER",     "gabriel.pinheiro@viasoft.com.br",  "Machine")
[Environment]::SetEnvironmentVariable("AGROFIT_PASSWORD", $pass,                               "Machine")
[Environment]::SetEnvironmentVariable("AGROFIT_KEY",      "pPEoE5e8nTVA6XXD0lVfdx22ha8a",    "Machine")
[Environment]::SetEnvironmentVariable("AGROFIT_SECRET",   "FeM6IzsgJIh0j_85ZHXcP1c5m3oa",    "Machine")

Write-Host "Pronto! Agora rode: pm2 restart all"
