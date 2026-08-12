$ErrorActionPreference = 'Stop'
Set-Location E:\workshop-erp
Get-Process git-credential-manager -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill
$token = (($cred | Where-Object { $_ -match '^password=' }) -replace '^password=','').Trim()
$user = 'abubakrjannn97-alt'
$repo = 'workshop-erp'
$log = 'E:\tools\gh\push-log.txt'
function Log($m) { "$(Get-Date -Format o) $m" | Tee-Object -FilePath $log -Append }

Log "tokenLen=$($token.Length)"
$check = curl.exe -sS --connect-timeout 20 --max-time 60 -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$user/$repo"
if ($check -match '"message": "Not Found"') {
  Log 'creating repo'
  Set-Content E:\tools\gh\create.json '{"name":"workshop-erp","description":"Workshop ERP/MRP for tile/stone production (TZ)","private":false}' -Encoding ascii
  $create = curl.exe -sS --connect-timeout 20 --max-time 60 -X POST -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" https://api.github.com/user/repos --data-binary "@E:\tools\gh\create.json"
  Log $create
} else {
  Log "repo exists"
}

git remote set-url origin "https://github.com/$user/$repo.git"
$pushUrl = "https://${user}:$token@github.com/$user/$repo.git"
Log 'pushing'
$push = git -c credential.helper= push -u $pushUrl HEAD:main 2>&1
Log ($push -join "`n")
Log "exit=$LASTEXITCODE"
git remote set-url origin "https://github.com/$user/$repo.git"
$final = curl.exe -sS --connect-timeout 20 --max-time 60 -H "Authorization: Bearer $token" -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$user/$repo"
Log $final
