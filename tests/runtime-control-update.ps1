$ErrorActionPreference = 'Stop'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('hgr-control-update-' + [guid]::NewGuid().ToString('N'))
$helpers = Join-Path $fixture 'scripts/windows'
$runtime = Join-Path $fixture 'server/data/runtime'
New-Item -ItemType Directory -Force $helpers, $runtime | Out-Null
Copy-Item (Join-Path $PSScriptRoot '../scripts/windows/refresh-control-after-update.ps1') $helpers
$global:controlTestRuntime = $runtime
$global:controlTestCalls = 0
$global:controlTestPid = 101
$global:controlTestKeepToken = $false
function global:Get-NetTCPConnection { [pscustomobject]@{ OwningProcess=$global:controlTestPid } }
function global:Get-Process { [pscustomobject]@{ StartTime=[datetime]'2026-10-02T10:00:00Z' } }
Set-Content (Join-Path $helpers 'stop-control.ps1') '$global:controlTestCalls++; $global:LASTEXITCODE=0'
Set-Content (Join-Path $helpers 'start-control.ps1') @'
param([int]$HttpsPort)
$global:controlTestCalls++
if ($HttpsPort -ne 9443) { throw 'Saved Serve port was not preserved' }
if (-not $global:controlTestKeepToken) { Set-Content (Join-Path $global:controlTestRuntime '.hgr-control-token') 'fresh-test-credential' }
$global:LASTEXITCODE=0
'@
$helper = Join-Path $helpers 'refresh-control-after-update.ps1'
function Assert-Calls($expected) { if ($global:controlTestCalls -ne $expected) { throw "Expected $expected lifecycle calls" } }
try {
    & $helper -Capture
    '{"listenerPid":101,"localPort":43127,"httpsPort":9443}' | Set-Content (Join-Path $runtime 'hgr-control-mobile-state.json')
    & $helper
    Assert-Calls 0 # Stopped before update remains untouched even if started meanwhile.
    Set-Content (Join-Path $runtime '.hgr-control-token') 'old-test-credential'
    & $helper -Capture
    & $helper
    Assert-Calls 2
    & $helper -Capture
    $global:controlTestPid = 202
    & $helper
    Assert-Calls 2 # Stale/reused listener does not get stopped.
    $global:controlTestPid = 101
    '{"listenerPid":101,"localPort":43127,"httpsPort":9443}' | Set-Content (Join-Path $runtime 'hgr-control-mobile-state.json')
    Set-Content (Join-Path $runtime '.hgr-control-token') 'old-test-credential'
    $global:controlTestKeepToken = $true
    & $helper -Capture
    $rejected = $false
    try { & $helper } catch { $rejected = $_.Exception.Message -match 'rotate' }
    if (-not $rejected) { throw 'Unrotated credentials were accepted' }
    Write-Output 'PASS Control update snapshot, stopped/replaced cases, port preservation and credential rotation'
} finally {
    # Only this test's explicitly created temporary fixture is removed.
    if ([IO.Path]::GetFullPath($fixture).StartsWith([IO.Path]::GetTempPath()) -and (Split-Path $fixture -Leaf) -like 'hgr-control-update-*') { Remove-Item -LiteralPath $fixture -Recurse -Force }
    Remove-Item Function:/Get-NetTCPConnection, Function:/Get-Process
}
