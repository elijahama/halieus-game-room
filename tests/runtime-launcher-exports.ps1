$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$validationRoot = [IO.Path]::GetFullPath((Join-Path $sourceRoot 'server/data/runtime'))
$fixture = Join-Path $validationRoot ('launcher-exports, validation-' + [guid]::NewGuid().ToString('N'))
$savedAppData = $env:APPDATA
function Assert-Rejected([scriptblock]$Action, [string]$Reason, [string]$MessagePattern) {
    $rejected = $false
    try { & $Action } catch {
        if ($_.Exception.Message -notmatch $MessagePattern) { throw }
        $rejected = $true
    }
    if (-not $rejected) { throw "Expected rejection: $Reason" }
}
try {
    $helpers = Join-Path $fixture 'scripts/windows'
    $references = Join-Path $fixture 'assets/branding/references'
    $delivery = Join-Path $fixture 'server/control-ui'
    $exports = Join-Path $fixture 'server/data/runtime/launcher-icons'
    New-Item -ItemType Directory -Force $helpers, $references, $delivery, $exports | Out-Null
    foreach ($name in @('generate-launcher-icons.ps1','launcher-shortcuts.ps1')) {
        Copy-Item -LiteralPath (Join-Path $sourceRoot "scripts/windows/$name") -Destination $helpers
    }
    foreach ($name in @('HGR Main.png','HGR Start.png','HGR Restart.png','HGR Close.png','HGR Update.png','HGR PowerShell.png','HGR OpenShard.png','HGR Control Launcher.png','control-artwork.json')) {
        Copy-Item -LiteralPath (Join-Path $sourceRoot "assets/branding/references/$name") -Destination $references
    }
    Copy-Item -LiteralPath (Join-Path $sourceRoot 'server/control-ui/control-icon.png') -Destination $delivery
    foreach ($name in @('Start Halieus Game Room.cmd','Restart Halieus Game Room.cmd','Close Halieus Game Room.cmd','Update Halieus Website.cmd','Start HGR Control.cmd','Stop HGR Control.cmd','scripts/windows/OpenShard-HGR.cmd')) {
        Set-Content -LiteralPath (Join-Path $fixture $name) -Value '@exit /b 0'
    }
    Set-Content -LiteralPath (Join-Path $exports 'stale.ico') -Value 'stale'
    . (Join-Path $helpers 'generate-launcher-icons.ps1')
    if (Test-Path -LiteralPath (Join-Path $exports 'stale.ico')) { throw 'Stale icon survived regeneration' }
    if ((Get-FileHash (Join-Path $exports 'control.png')).Hash -eq (Get-FileHash (Join-Path $exports 'control-stop.png')).Hash) { throw 'Stop icon must be distinct' }
    $ico = Join-Path $exports 'control.ico'
    $bytes = [IO.File]::ReadAllBytes($ico)
    $bytes[$bytes.Length - 1] = $bytes[$bytes.Length - 1] -bxor 1
    [IO.File]::WriteAllBytes($ico, $bytes)
    Assert-Rejected { Assert-HgrRuntimeIconExport -Name control -PngPath (Join-Path $exports 'control.png') -IcoPath $ico } 'corrupted embedded ICO image' 'must contain the verified'

    # Real Windows COM .lnk metadata, but only in an isolated fake Start Menu.
    $env:APPDATA = Join-Path $fixture 'appdata'
    . (Join-Path $helpers 'launcher-shortcuts.ps1') -UnhideScripts
    if ($CreatedShortcuts.Count -ne 16) { throw 'Expected all eight roles in both managed folders' }
    $changed = $wsh.CreateShortcut($ProjectControlShortcut)
    $changed.IconLocation = "$ControlIconPath,1"
    $changed.Save()
    Assert-Rejected { Assert-HalieusShortcutIcon -ShortcutPath $ProjectControlShortcut -ExpectedIconPath $ControlIconPath } 'wrong icon index' 'icon index zero'
    $changed.Arguments = '/c wrong.cmd'
    $changed.Save()
    Assert-Rejected { Assert-HalieusShortcutCommandScript -ShortcutPath $ProjectControlShortcut -ExpectedCommandScript $ControlScript } 'wrong command' 'target mismatch'

    function Start-Process { [pscustomobject]@{ ExitCode = 1 } }
    Assert-Rejected { & (Join-Path $helpers 'launcher-shortcuts.ps1') -UnhideScripts } 'cache-refresh failure' 'icon-cache refresh failed'
    Remove-Item Function:Start-Process
    # Two identical, valid square PNGs are still wrong if they are not approved.
    Copy-Item -LiteralPath (Join-Path $references 'HGR Main.png') -Destination (Join-Path $references 'HGR Control Launcher.png') -Force
    Copy-Item -LiteralPath (Join-Path $references 'HGR Main.png') -Destination (Join-Path $delivery 'control-icon.png') -Force
    Assert-Rejected { & (Join-Path $helpers 'generate-launcher-icons.ps1') } 'unapproved square artwork' 'not the owner-approved'
    Write-Host 'PASS actual Windows icon exports, stale cleanup, all shortcut metadata, corruption/wrong-artwork rejection and cache failure'
} finally {
    $env:APPDATA = $savedAppData
    $resolvedFixture = [IO.Path]::GetFullPath($fixture)
    if (-not $resolvedFixture.StartsWith($validationRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe fixture cleanup path' }
    if (Test-Path -LiteralPath $resolvedFixture) { Remove-Item -LiteralPath $resolvedFixture -Recurse -Force }
}
