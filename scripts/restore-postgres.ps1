param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile
)
$ErrorActionPreference = "Stop"
$bin = "C:\Program Files\PostgreSQL\16\bin"
$env:PGPASSWORD = "workshop"
if (-not (Test-Path $DumpFile)) { throw "Файл дампа не найден: $DumpFile" }
& "$bin\pg_restore.exe" -h localhost -p 5433 -U workshop -d workshop --clean --if-exists $DumpFile
if ($LASTEXITCODE -ne 0) { throw "pg_restore exit $LASTEXITCODE" }
Write-Output "Restored $DumpFile"
