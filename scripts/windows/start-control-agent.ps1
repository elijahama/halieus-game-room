param()

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$runtimeDir = Join-Path $projectRoot "server\data\runtime"
$tokenPath = Join-Path $runtimeDir ".hgr-control-token"

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$token = & node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
    throw "Could not generate an HGR Control token with Node."
}

Set-Content -Path $tokenPath -Value $token -Encoding Ascii -NoNewline
$env:HGR_CONTROL_TOKEN = $token

Write-Host ""
Write-Host "HGR Control local development agent" -ForegroundColor Yellow
Write-Host "Token stored temporarily at:" -ForegroundColor DarkGray
Write-Host "  $tokenPath" -ForegroundColor DarkGray
Write-Host "From another PowerShell, run the root client entrypoint:" -ForegroundColor Cyan
Write-Host "  & '$projectRoot\HGR-Control.cmd' status" -ForegroundColor Cyan
Write-Host "  & '$projectRoot\HGR-Control.cmd' restart" -ForegroundColor Cyan
Write-Host "  & '$projectRoot\HGR-Control.cmd' logs" -ForegroundColor Cyan
Write-Host ""

Push-Location $projectRoot
try {
    & npm run control:dev
    if ($LASTEXITCODE -ne 0) {
        throw "HGR Control agent exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
    Remove-Item -LiteralPath $tokenPath -Force -ErrorAction SilentlyContinue
    Remove-Item Env:HGR_CONTROL_TOKEN -ErrorAction SilentlyContinue
    Write-Host "HGR Control temporary token removed." -ForegroundColor DarkGray
}
