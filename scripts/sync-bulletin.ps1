param(
  [string]$Destination = "C:\Users\Gyeonghwan Do\OneDrive\Documents\Chruch Bulletin Software"
)

$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $PSScriptRoot

$bulletinPaths = @(
  "app\api\bulletin\route.ts"
  "app\api\export-pdf\route.ts"
  "app\components\BulletinFitController.tsx"
  "app\components\BulletinPreview.tsx"
  "app\print\layout.tsx"
  "app\print\page.tsx"
  "app\layout.tsx"
  "app\page.tsx"
  "data\bulletin.en.json"
  "lib\bulletin-types.ts"
  "public\church.jpg"
  "public\logo-full.png"
  "scripts\sync-bulletin.ps1"
)

if (-not (Test-Path -LiteralPath $Destination -PathType Container)) {
  throw "Destination folder does not exist: $Destination"
}

foreach ($relativePath in $bulletinPaths) {
  $sourcePath = Join-Path $source $relativePath
  if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Required bulletin file does not exist: $sourcePath"
  }

  $destinationPath = Join-Path $Destination $relativePath
  $destinationDirectory = Split-Path -Parent $destinationPath
  New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
  Write-Output "Synced $relativePath"
}

Write-Output "Bulletin files synced to $Destination"
