# GitHub push/pull용 SSH 키 1회 설정 (Cursor·Git Bash 공통)
#
# Usage:
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   cd e:\workspace\horizon
#   .\scripts\setup-github-ssh.ps1
#
# Then: copy public key -> GitHub Settings -> SSH keys -> New SSH key
#       ssh -T git@github.com
#       git push origin master

$ErrorActionPreference = 'Stop'

$sshDir = Join-Path $env:USERPROFILE '.ssh'
$keyPath = Join-Path $sshDir 'id_ed25519_github'
$pubPath = "$keyPath.pub"
$configPath = Join-Path $sshDir 'config'
$knownHosts = Join-Path $sshDir 'known_hosts'

if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir | Out-Null
}

if (-not (Test-Path $keyPath)) {
    Write-Host "Generating GitHub SSH key: $keyPath" -ForegroundColor Cyan
    ssh-keygen -t ed25519 -f $keyPath -N '""' -C 'ktdvlp-jih@github-horizon'
} else {
    Write-Host "Key already exists: $keyPath" -ForegroundColor Yellow
}

$githubBlock = @"

Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes

"@

function Write-Utf8NoBomFile {
    param([string]$Path, [string]$Content)
    $enc = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

if (Test-Path $configPath) {
    $cfg = Get-Content $configPath -Raw
    if ($cfg -notmatch 'Host github\.com') {
        Write-Utf8NoBomFile -Path $configPath -Content ($cfg.TrimEnd() + "`n" + $githubBlock.TrimStart())
        Write-Host "[ok] Appended github.com to $configPath" -ForegroundColor Green
    } else {
        Write-Utf8NoBomFile -Path $configPath -Content $githubBlock.TrimStart()
        Write-Host "[ok] Refreshed github.com block in $configPath" -ForegroundColor Green
    }
} else {
    Write-Utf8NoBomFile -Path $configPath -Content $githubBlock.TrimStart()
    Write-Host "[ok] Created $configPath" -ForegroundColor Green
}

if (-not (Select-String -Path $knownHosts -Pattern 'github\.com' -Quiet -ErrorAction SilentlyContinue)) {
    Write-Host "Adding github.com to known_hosts..." -ForegroundColor Cyan
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    ssh-keyscan -t ed25519 github.com 2>$null | Out-File -Append -Encoding ascii $knownHosts
    if (-not (Select-String -Path $knownHosts -Pattern 'github\.com' -Quiet -ErrorAction SilentlyContinue)) {
        Add-Content -Path $knownHosts -Encoding ascii -Value 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzRm0ad9cGYPQt6DKq1N5F5Y0n8V9C4q3w'
    }
    $ErrorActionPreference = $prev
}

# Ensure git remote uses SSH
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
$remote = git remote get-url origin 2>$null
if ($remote -notmatch '^git@github\.com:') {
    git remote set-url origin git@github.com:ktdvlp-jih/horizon.git
    Write-Host "[ok] git remote -> git@github.com:ktdvlp-jih/horizon.git" -ForegroundColor Green
} else {
    Write-Host "[ok] git remote already SSH: $remote" -ForegroundColor Green
}

Write-Host @"

=== Next: register public key on GitHub ===

1. Open: https://github.com/settings/ssh/new
2. Title: horizon-pc (or any name)
3. Key type: Authentication Key
4. Paste ENTIRE line below:

"@ -ForegroundColor Cyan

Get-Content $pubPath

Write-Host @"
5. Test:
   ssh -T git@github.com
   (type 'yes' if asked; expect: Hi ktdvlp-jih! ...)

6. Push (Cursor terminal / Git Bash):
   cd e:\workspace\horizon
   git push origin master

After this, Cursor commit+push works without PAT each time.
"@ -ForegroundColor Green

# Try clip.exe
try {
    Get-Content $pubPath | Set-Clipboard
    Write-Host "[ok] Public key copied to clipboard" -ForegroundColor Green
} catch {
    Write-Host "[info] Copy the public key manually" -ForegroundColor Yellow
}
