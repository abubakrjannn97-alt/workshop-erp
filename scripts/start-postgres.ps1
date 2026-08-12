$bin = "C:\Program Files\PostgreSQL\16\bin"
$data = "E:\workshop-erp\.data\pgdata"
$log = "E:\workshop-erp\.data\logs\postgres.log"
New-Item -ItemType Directory -Force -Path "E:\workshop-erp\.data\logs" | Out-Null
& "$bin\pg_ctl.exe" -D $data status
if ($LASTEXITCODE -ne 0) {
  & "$bin\pg_ctl.exe" -D $data -l $log start
}
