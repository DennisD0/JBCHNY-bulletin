# start-mobile.ps1 — Start the choir player + public tunnel for phone testing.
# Double-click or run: powershell -ExecutionPolicy Bypass -File start-mobile.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cf   = Join-Path $root "tools\cloudflared.exe"

Write-Host ""
Write-Host "=== NEW YORK CHURCH CHOIR - Mobile Dev Server ===" -ForegroundColor Cyan
Write-Host ""

# Start Next.js dev server in a background window
Write-Host "Starting Next.js on http://localhost:3000..." -ForegroundColor Yellow
$app = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev" -PassThru -WindowStyle Normal

# Give it a few seconds to bind the port
Start-Sleep -Seconds 5

Write-Host "Opening public tunnel..." -ForegroundColor Yellow
Write-Host ""

# cloudflare quick tunnel — no account needed, prints URL to stdout
& $cf tunnel --url http://localhost:3000 2>&1 | ForEach-Object {
    # Print every line; highlight the public URL
    if ($_ -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
        $url = $Matches[0]
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  OPEN ON YOUR PHONE:" -ForegroundColor Green
        Write-Host "  $url" -ForegroundColor White -BackgroundColor DarkGreen
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        # Also copy to clipboard
        $url | Set-Clipboard
        Write-Host "(URL copied to clipboard)" -ForegroundColor Gray
    } else {
        Write-Host $_
    }
}

# Clean up Next.js when tunnel closes
if ($app -and !$app.HasExited) { $app.Kill() }
