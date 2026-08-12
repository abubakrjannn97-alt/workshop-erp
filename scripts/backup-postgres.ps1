$ErrorActionPreference = "Stop"
$bin = "C:\Program Files\PostgreSQL\16\bin"
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root ".data\backups"
$journal = Join-Path $backupDir "journal.jsonl"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $backupDir "workshop-$stamp.dump"
$env:PGPASSWORD = "workshop"

$ok = $true
$err = ""
try {
  & "$bin\pg_dump.exe" -h localhost -p 5433 -U workshop -Fc -f $file workshop
  if ($LASTEXITCODE -ne 0) { throw "pg_dump exit $LASTEXITCODE" }
} catch {
  $ok = $false
  $err = "$_"
}

$entry = @{
  at = (Get-Date).ToString("o")
  file = $file
  ok = $ok
  error = $err
  size = if (Test-Path $file) { (Get-Item $file).Length } else { 0 }
} | ConvertTo-Json -Compress
Add-Content -Path $journal -Value $entry -Encoding UTF8

Get-ChildItem $backupDir -Filter "workshop-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  Remove-Item -Force

if (-not $ok) { throw $err }
Write-Output "OK $file"
