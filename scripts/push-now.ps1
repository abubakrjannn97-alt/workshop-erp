$ErrorActionPreference = 'Continue'
Set-Location E:\workshop-erp
Get-Process git-credential-manager -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = (($cred | Where-Object { $_ -match '^password=' }) -replace '^password=','').Trim()
$user = (($cred | Where-Object { $_ -match '^username=' }) -replace '^username=','').Trim()
"user=$user" | Out-File E:\tools\gh\push2.txt -Encoding ascii
$env:GIT_TERMINAL_PROMPT = '0'
$pushUrl = "https://x-access-token:$token@github.com/abubakrjannn97-alt/workshop-erp.git"
git -c credential.helper= push --porcelain $pushUrl HEAD:main *> E:\tools\gh\push2-out.txt
"exit=$LASTEXITCODE" | Out-File E:\tools\gh\push2.txt -Append -Encoding ascii
Get-Content E:\tools\gh\push2-out.txt | ForEach-Object { $_ -replace [regex]::Escape($token), '***' } | Out-File E:\tools\gh\push2-redacted.txt -Encoding ascii
