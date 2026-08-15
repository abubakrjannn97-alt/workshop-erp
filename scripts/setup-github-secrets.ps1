# One-time setup: add Vercel secrets to GitHub Actions.
# Requires: GitHub CLI (`gh`) authenticated for abubakrjannn97-alt/workshop-erp

$ErrorActionPreference = "Stop"

$repo = "abubakrjannn97-alt/workshop-erp"
$vercelAuthPath = Join-Path $env:APPDATA "xdg.data/com.vercel.cli/auth.json"
$projectPath = Join-Path $PSScriptRoot "..\.vercel\project.json"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "Install GitHub CLI first: winget install GitHub.cli"
  exit 1
}

if (-not (Test-Path $vercelAuthPath)) {
  Write-Host "Vercel auth not found. Run: vercel login"
  exit 1
}

$auth = Get-Content $vercelAuthPath -Raw | ConvertFrom-Json
$project = Get-Content (Resolve-Path $projectPath) -Raw | ConvertFrom-Json

gh secret set VERCEL_TOKEN --repo $repo --body $auth.token
gh secret set VERCEL_ORG_ID --repo $repo --body $project.orgId
gh secret set VERCEL_PROJECT_ID --repo $repo --body $project.projectId

Write-Host "GitHub Actions secrets configured for $repo"
