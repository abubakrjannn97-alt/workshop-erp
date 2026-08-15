$ErrorActionPreference = 'Continue'
Set-Location E:\workshop-erp
$lines = "protocol=https`nhost=github.com`n`n"
$credOut = $lines | git credential fill
$userLine = @($credOut | Where-Object { $_ -like 'username=*' })[0]
$passLine = @($credOut | Where-Object { $_ -like 'password=*' })[0]
$user = $userLine.Substring(9)
$token = $passLine.Substring(9)
"auth user=$user tokenLen=$($token.Length)" | Tee-Object E:\tools\gh\push3-meta.txt

git config --local http.version HTTP/1.1
git config --local http.postBuffer 524288000
git config --local http.lowSpeedLimit 0
git config --local http.lowSpeedTime 999999

$pushUrl = "https://${user}:$token@github.com/abubakrjannn97-alt/workshop-erp.git"
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
git -c credential.helper= -c http.version=HTTP/1.1 push --verbose $pushUrl HEAD:main *> E:\tools\gh\push3-out.txt
"exit=$LASTEXITCODE" | Tee-Object E:\tools\gh\push3-exit.txt -Append
Get-Content E:\tools\gh\push3-out.txt | ForEach-Object { $_ -replace [regex]::Escape($token), '***' } | Set-Content E:\tools\gh\push3-safe.txt
Get-Content E:\tools\gh\push3-safe.txt
Get-Content E:\tools\gh\push3-exit.txt
git remote set-url origin https://github.com/abubakrjannn97-alt/workshop-erp.git
git status -sb
