# GitHub Actions SSH -> trigger deploy in interactive Windows session (Docker Desktop)
# Usage: called from deploy.yml via SSH (not run manually)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TaskName = 'HorizonGitHubDeploy'
$StatusFile = Join-Path $Root '.deploy-status.json'
$LogFile = Join-Path $Root '.deploy-last.log'

function Write-DeployStatus {
    param([string]$Status, [int]$ExitCode = 0, [string]$Message = '')
    @{
        status    = $Status
        exitCode  = $ExitCode
        message   = $Message
        updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress | Set-Content -Path $StatusFile -Encoding UTF8
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-DeployStatus -Status 'failed' -ExitCode 1 -Message "Scheduled task '$TaskName' missing. Run scripts/setup-deploy-task.ps1 on home PC."
    exit 1
}

Write-DeployStatus -Status 'queued' -Message 'Triggering scheduled task'
Remove-Item $StatusFile -Force -ErrorAction SilentlyContinue
schtasks /run /tn $TaskName | Out-Null

$deadline = (Get-Date).AddMinutes(40)
$lastStatus = ''

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 8
    if (-not (Test-Path $StatusFile)) { continue }

    try {
        $state = Get-Content $StatusFile -Raw | ConvertFrom-Json
    } catch {
        continue
    }

    if ($state.status -ne $lastStatus) {
        Write-Host "deploy status: $($state.status)"
        $lastStatus = $state.status
    }

    if ($state.status -eq 'success') {
        if (Test-Path $LogFile) { Get-Content $LogFile -Tail 20 }
        exit 0
    }
    if ($state.status -eq 'failed') {
        if (Test-Path $LogFile) { Get-Content $LogFile -Tail 40 }
        Write-Host $state.message
        exit [int]$state.exitCode
    }
}

Write-DeployStatus -Status 'failed' -ExitCode 1 -Message 'Deploy timed out after 40 minutes'
exit 1
