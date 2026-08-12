$task = "WorkshopErpDailyBackup"
$script = Join-Path $PSScriptRoot "backup-postgres.ps1"
schtasks /Create /F /TN $task /SC DAILY /ST 03:00 /TR "powershell.exe -NoProfile -File `"$script`""
Write-Output "Scheduled $task -> $script"
