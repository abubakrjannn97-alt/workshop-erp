$task = "WorkshopErpDailyBackup"
$root = Split-Path -Parent $PSScriptRoot
$tr = "powershell.exe -NoProfile -Command `"Set-Location '$root'; npm run db:backup`""
schtasks /Create /F /TN $task /SC DAILY /ST 03:00 /TR $tr
Write-Output "Scheduled $task -> npm run db:backup in $root"
