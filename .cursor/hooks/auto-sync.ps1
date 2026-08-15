$ErrorActionPreference = "Continue"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$logDir = Join-Path $root ".cursor/hooks"
$logFile = Join-Path $logDir "auto-sync.log"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log([string]$Message) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $logFile -Value $line -Encoding UTF8
}

if (-not (Test-Path ".git")) {
  exit 0
}

$lockFile = Join-Path $logDir "auto-sync.lock"
if (Test-Path $lockFile) {
  $age = (Get-Date) - (Get-Item $lockFile).LastWriteTime
  if ($age.TotalSeconds -lt 120) {
    Write-Log "Skip: sync already running recently."
    exit 0
  }
}

New-Item -ItemType File -Force -Path $lockFile | Out-Null

try {
  $changes = git status --porcelain 2>$null
  if (-not $changes) {
    Write-Log "No local changes."
    exit 0
  }

  git add -A 2>$null
  git reset HEAD -- .env .env.local .env.vercel .data .next .vercel node_modules 2>$null | Out-Null

  $staged = git diff --cached --name-only 2>$null
  if (-not $staged) {
    Write-Log "Only ignored/local files changed."
    exit 0
  }

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  $commitMsg = "auto: sync from Cursor $timestamp"
  git commit -m $commitMsg 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Commit skipped or failed."
    exit 0
  }

  Write-Log "Committed: $commitMsg"
  git push origin main 2>&1 | ForEach-Object { Write-Log $_ }

  if ($LASTEXITCODE -eq 0) {
    Write-Log "Pushed to GitHub."
  } else {
    Write-Log "Push failed; trying deploy anyway."
  }

  $vercel = Get-Command vercel -ErrorAction SilentlyContinue
  if ($vercel) {
    Write-Log "Deploying to Vercel production..."
    vercel deploy --prod --yes --non-interactive --archive=tgz 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -eq 0) {
      Write-Log "Vercel deploy finished."
    } else {
      Write-Log "Vercel deploy failed."
    }
  } else {
    Write-Log "Vercel CLI not found."
  }
}
finally {
  Remove-Item -Force $lockFile -ErrorAction SilentlyContinue
}

exit 0
