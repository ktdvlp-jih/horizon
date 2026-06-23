# GitHub Actions -> home PC SSH deploy key (run once on home PC)
# Windows Administrators group -> C:\ProgramData\ssh\administrators_authorized_keys
# MUST run in elevated (Administrator) PowerShell if your account is in Administrators group.
#
# Usage:
#   Start -> PowerShell -> "관리자 권한으로 실행"
#   cd e:\workspace\horizon
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\setup-deploy-ssh.ps1

$ErrorActionPreference = 'Stop'

function Test-IsElevated {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-IsAdministratorsGroupMember {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    foreach ($group in $identity.Groups) {
        if ($group.Value -eq 'S-1-5-32-544') { return $true }
    }
    return $false
}

function Get-DeployAuthorizedKeysPath {
    if (Test-IsAdministratorsGroupMember) {
        return 'C:\ProgramData\ssh\administrators_authorized_keys'
    }
    return Join-Path $env:USERPROFILE '.ssh\authorized_keys'
}

function Write-Utf8NoBomLine {
    param([string]$Path, [string]$Line)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $encoding = New-Object System.Text.UTF8Encoding $false
    if (Test-Path $Path) {
        $existing = [System.IO.File]::ReadAllText($Path, $encoding)
        if ($existing -match [regex]::Escape($Line.Trim())) {
            return $false
        }
        $sep = if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { "`n" } else { "" }
        [System.IO.File]::AppendAllText($Path, "$sep$($Line.Trim())`n", $encoding)
    } else {
        [System.IO.File]::WriteAllText($Path, "$($Line.Trim())`n", $encoding)
    }
    return $true
}

$isAdminGroup = Test-IsAdministratorsGroupMember
$isElevated = Test-IsElevated

if ($isAdminGroup -and -not $isElevated) {
    Write-Host @"

[ERROR] This Windows account is in the Administrators group.
OpenSSH ignores ~/.ssh/authorized_keys for admin accounts.
You MUST re-run in elevated PowerShell:

  1. Start menu -> type PowerShell
  2. Right-click -> Run as administrator
  3. cd e:\workspace\horizon
  4. .\scripts\setup-deploy-ssh.ps1

"@ -ForegroundColor Red
    exit 1
}

$sshDir = Join-Path $env:USERPROFILE '.ssh'
$keyPath = Join-Path $sshDir 'horizon_deploy'
$pubPath = "$keyPath.pub"
$authKeys = Get-DeployAuthorizedKeysPath

if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

if (-not (Test-Path $keyPath)) {
    Write-Host "Generating deploy key: $keyPath" -ForegroundColor Cyan
    ssh-keygen -t ed25519 -f $keyPath -N '""' -C 'horizon-github-actions-deploy'
} else {
    Write-Host "Key already exists: $keyPath" -ForegroundColor Yellow
}

$pub = (Get-Content $pubPath -Raw).Trim()
Write-Host "Authorized keys file: $authKeys" -ForegroundColor Cyan

if ($isAdminGroup) {
    Write-Host "[info] Administrators group -> ProgramData\ssh\administrators_authorized_keys" -ForegroundColor Yellow
} else {
    Write-Host "[info] Standard account -> ~/.ssh/authorized_keys" -ForegroundColor Yellow
}

$added = Write-Utf8NoBomLine -Path $authKeys -Line $pub
if ($added) {
    Write-Host "[ok] Public key added to $authKeys" -ForegroundColor Green
} else {
    Write-Host "[skip] Public key already in $authKeys" -ForegroundColor Yellow
}

Write-Host "`nTesting SSH key auth..." -ForegroundColor Cyan
$tailscaleIp = & 'C:\Program Files\Tailscale\tailscale.exe' ip -4 2>$null
if (-not $tailscaleIp) { $tailscaleIp = '127.0.0.1' }

$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$testOut = ssh -i $keyPath -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$env:USERNAME@${tailscaleIp}" "echo SSH_OK" 2>&1
$sshOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap

if ($sshOk) {
    Write-Host "[ok] SSH key auth works ($tailscaleIp)" -ForegroundColor Green
} else {
    Write-Host "[warn] SSH key test failed:" -ForegroundColor Red
    Write-Host $testOut
    exit 1
}

Write-Host @"

=== GitHub Repository Secrets ===

Settings -> Secrets and variables -> Actions -> New repository secret

| Secret name         | Value |
|---------------------|-------|
| TAILSCALE_AUTHKEY   | tskey-... (Reusable + Ephemeral) |
| DEPLOY_HOST         | $tailscaleIp |
| DEPLOY_USER         | $env:USERNAME |
| DEPLOY_SSH_KEY      | ENTIRE private key below (BEGIN~END) |

--- PRIVATE KEY (DEPLOY_SSH_KEY) ---
"@ -ForegroundColor Cyan

Get-Content $keyPath

Write-Host @"
--- END PRIVATE KEY ---

Then: Actions -> Deploy Docker (home PC) -> Run workflow
"@ -ForegroundColor Green
