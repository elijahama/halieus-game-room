param(
    [Parameter(Position = 0)]
    [ValidateSet("status", "restart", "logs")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$tokenPath = Join-Path $projectRoot "server\data\runtime\.hgr-control-token"
$baseUri = "http://127.0.0.1:43127"

if (-not (Test-Path -LiteralPath $tokenPath)) {
    throw "HGR Control token file not found. Start the agent with .\Start HGR Control.cmd first."
}

$token = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "HGR Control token file is empty."
}

$headers = @{ Authorization = "Bearer $token" }

switch ($Action) {
    "status" {
        Invoke-RestMethod -Uri "$baseUri/api/status" -Headers $headers
    }
    "restart" {
        Invoke-RestMethod -Method Post -Uri "$baseUri/api/actions/restart" -Headers $headers
    }
    "logs" {
        Invoke-RestMethod -Uri "$baseUri/api/logs" -Headers $headers
    }
}
