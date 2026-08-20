param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile
)
$ErrorActionPreference = "Stop"
Write-Output "This script does not restore into production."
Write-Output "Use clone verification:"
Write-Output "  npm run db:restore:verify -- `"$DumpFile`""
Write-Output "Set RESTORE_DATABASE_URL to a non-production database first."
exit 1
