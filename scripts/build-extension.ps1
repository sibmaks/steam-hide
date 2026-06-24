$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$packageDir = Join-Path $dist "steam-hider"
$zipPath = Join-Path $dist "steam-hider-chrome-vivaldi.zip"

npm run build:js

New-Item -ItemType Directory -Force -Path $dist | Out-Null

if (Test-Path $packageDir) {
    Remove-Item -Recurse -Force $packageDir
}

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $packageDir "icons") | Out-Null

Copy-Item (Join-Path $root "manifest.json") $packageDir
Copy-Item (Join-Path $root "build/steam.hide.js") $packageDir
Copy-Item (Join-Path $root "build/content.js") $packageDir
Copy-Item (Join-Path $root "build/options.js") $packageDir
Copy-Item (Join-Path $root "steam.hide.css") $packageDir
Copy-Item (Join-Path $root "options.html") $packageDir
Copy-Item (Join-Path $root "options.css") $packageDir
Copy-Item (Join-Path $root "LICENSE") $packageDir
Copy-Item (Join-Path $root "icons\*.png") (Join-Path $packageDir "icons")
Copy-Item (Join-Path $root "icons\*.png") $packageDir

Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath

Write-Host "Built $zipPath"
