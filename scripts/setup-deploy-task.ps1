# Scheduled task for Docker deploy in interactive session (home PC, 1x admin)
# Fixes: Docker credential error over SSH ("logon session does not exist")
#
# Usage (Administrator PowerShell):
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   cd e:\workspace\horizon
#   .\scripts\setup-deploy-task.ps1

$ErrorActionPreference = 'Stop'
$Root = 'e:\workspace\horizon'
$TaskName = 'HorizonGitHubDeploy'
$Script = Join-Path $Root 'scripts\deploy-docker.ps1'

if (-not (Test-Path $Script)) {
    throw "Missing $Script"
}

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`"" `
    -WorkingDirectory $Root

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

$trigger = New-ScheduledTaskTrigger -AtLogon

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $action -Principal $principal -Settings $settings -Trigger $trigger -ErrorAction Stop | Out-Null

Write-Host "[ok] Registered scheduled task: $TaskName" -ForegroundColor Green
Write-Host "     Runs deploy-docker.ps1 hidden (interactive session, no console window)." -ForegroundColor Gray
Write-Host "     Re-run this script after pulling changes to setup-deploy-task.ps1." -ForegroundColor Gray
Write-Host "     GitHub Actions SSH calls scripts/deploy-docker-trigger.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Test: schtasks /run /tn $TaskName" -ForegroundColor Cyan
