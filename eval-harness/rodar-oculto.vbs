' Chama rodar.ps1 sem nenhuma janela aparecer -- "-WindowStyle Hidden" do PowerShell
' ainda pisca uma janela em boa parte das versões do Windows; WshShell.Run com o
' parâmetro de estilo 0 é o jeito que de fato não mostra nada. Propaga o código de
' saída (pro Agendador de Tarefas registrar sucesso/falha direito).
Set objShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
comando = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\rodar.ps1"""
codigoSaida = objShell.Run(comando, 0, True)
WScript.Quit(codigoSaida)
