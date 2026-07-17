# CimoFlix sync: pull favourites.xml from Vercel, push it to the Xbox over FTP.
# Edit these two lines:
$App  = "https://YOUR-APP.vercel.app"
$Xbox = "ftp://xbox:xbox@192.168.1.50"

$tmp = Join-Path $env:TEMP "favourites.xml"
curl.exe -sf "$App/favourites.xml" -o $tmp
if ($LASTEXITCODE -ne 0) { Write-Host "download failed"; exit 1 }
curl.exe -sf -T $tmp "$Xbox/system/favourites.xml"
if ($LASTEXITCODE -ne 0) { Write-Host "ftp push failed (is the console on and running XBMC?)"; exit 1 }
Write-Host "synced. Reopen the library on the Xbox (B, then A) to see changes."

# To run this automatically every 10 minutes while your PC is on:
#   schtasks /create /tn "CimoFlix Sync" /sc minute /mo 10 /tr "powershell -NoProfile -ExecutionPolicy Bypass -File \"E:\Claude Code\CimoFlix\sync\sync.ps1\""
# (The FTP push simply fails quietly when the console is off; next run catches up.)
