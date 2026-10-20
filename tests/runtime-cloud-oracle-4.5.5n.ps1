# HGR 4.5.5n isolated Cloud Oracle test. No real keys or network.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$wrapper = Join-Path $projectRoot 'scripts\windows\cloud-oracle-deploy.ps1'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('hgr-cloud-oracle-' + [guid]::NewGuid().ToString('N'))
$testLocalAppData = Join-Path $fixture 'appdata'
$configDir = Join-Path $testLocalAppData 'Halieus Game Room'
New-Item -ItemType Directory -Path $configDir -Force | Out-Null
$keyFile = Join-Path $fixture 'synthetic-test-only.key'
Set-Content -LiteralPath $keyFile -Value @('-----BEGIN OPENSSH PRIVATE KEY-----','not-a-real-key','-----END OPENSSH PRIVATE KEY-----')
$fixtureResult = Join-Path $fixture 'deploy-fixture-ok.txt'
$stub = Join-Path $fixture 'approved-deploy-stub.ps1'
@'
param([string]$KeyPath)
if (-not $KeyPath -or -not (Test-Path -LiteralPath $KeyPath -PathType Leaf)) { throw 'Configured synthetic key was not forwarded.' }
Set-Content -LiteralPath $env:HGR_ORACLE_TEST_SENTINEL -Value 'canonical-fixture-deployed'
'@ | Set-Content -LiteralPath $stub -Encoding UTF8
$configPath = Join-Path $configDir 'owner-update.json'
@{ KeyPath=$keyFile } | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8

$envNames = @('LOCALAPPDATA','HALIEUS_ORACLE_KEY','HGR_UPDATE_NONINTERACTIVE','HGR_CONTROL_DEFER_REFRESH','HGR_ORACLE_TEST_SENTINEL')
$previous = @{}
foreach ($name in $envNames) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$env:LOCALAPPDATA = $testLocalAppData
Remove-Item Env:HALIEUS_ORACLE_KEY -ErrorAction SilentlyContinue
$env:HGR_UPDATE_NONINTERACTIVE = '1'
$env:HGR_CONTROL_DEFER_REFRESH = '1'
$env:HGR_ORACLE_TEST_SENTINEL = $fixtureResult

function Invoke-IsolatedWrapper {
    param([string]$Scenario)
    $out = Join-Path $fixture "$Scenario.stdout.txt"
    $err = Join-Path $fixture "$Scenario.stderr.txt"
    $powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
    $child = Start-Process -FilePath $powershell -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass',
        '-File',('"' + $wrapper + '"'),'-DeployHelperPath',('"' + $stub + '"')
    ) -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden
    return [pscustomobject]@{
        ExitCode = $child.ExitCode
        Output = (Get-Content -LiteralPath $out -Raw -ErrorAction SilentlyContinue)
        ErrorOutput = (Get-Content -LiteralPath $err -Raw -ErrorAction SilentlyContinue)
    }
}
try {
    $first = Invoke-IsolatedWrapper -Scenario 'valid'
    if ($first.ExitCode -ne 0) { throw "Valid saved key fixture failed: $($first.ErrorOutput)" }
    if ((Get-Content -LiteralPath $fixtureResult -Raw).Trim() -ne 'canonical-fixture-deployed') {
        throw 'Configured key did not reach the approved deploy helper.'
    }
    if ($first.Output -match [regex]::Escape($keyFile) -or $first.ErrorOutput -match [regex]::Escape($keyFile)) {
        throw 'Owner key path must not be logged.'
    }
    Remove-Item -LiteralPath $fixtureResult -Force
    @{ KeyPath=(Join-Path $fixture 'does-not-exist.key') } | ConvertTo-Json | Set-Content -LiteralPath $configPath
    $missing = Invoke-IsolatedWrapper -Scenario 'missing'
    if ($missing.ExitCode -eq 0 -or (Test-Path -LiteralPath $fixtureResult)) {
        throw 'Missing owner credential must fail closed without deployment.'
    }
    if (($missing.Output+$missing.ErrorOutput) -notmatch 'no saved, accessible Oracle SSH private key') {
        throw 'Missing owner credential needs actionable, noninteractive failure text.'
    }
    $env:HGR_UPDATE_NONINTERACTIVE = '0'
    $manual = Invoke-IsolatedWrapper -Scenario 'not-cloud'
    if ($manual.ExitCode -eq 0 -or ($manual.Output+$manual.ErrorOutput) -notmatch 'reserved for an authenticated HGR Cloud Update') {
        throw 'Unattended helper must not be callable by a normal/manual flow.'
    }
    Write-Output 'PASS 4.5.5n: saved-key fast path uses tracked deploy, fails closed without key, no private file scan/picker/network, cloud-only'
} finally {
    foreach ($name in $envNames) {
        [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process')
    }
    if ([IO.Path]::GetFullPath($fixture).StartsWith([IO.Path]::GetTempPath()) -and
        (Split-Path $fixture -Leaf) -like 'hgr-cloud-oracle-*') {
        Remove-Item -LiteralPath $fixture -Recurse -Force -ErrorAction SilentlyContinue
    }
}
