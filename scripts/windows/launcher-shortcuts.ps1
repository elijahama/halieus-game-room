param(
    [switch]$UnhideScripts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# Shortcut refresh exports runtime ICO/PNG files directly from approved PNG
# artwork. No launcher art is redrawn here.
$TrackedGameRoomIconPath = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.ico'
$RuntimeLauncherIconRoot = Join-Path $ProjectRoot 'server\data\runtime\launcher-icons'
$IconGenerator = Join-Path $ProjectRoot 'scripts\windows\generate-launcher-icons.ps1'

if (-not (Test-Path -LiteralPath $IconGenerator)) {
    throw "HGR launcher icon generator is missing: $IconGenerator"
}
& $IconGenerator

$StartIconPath = Join-Path $RuntimeLauncherIconRoot 'start.ico'
$RestartIconPath = Join-Path $RuntimeLauncherIconRoot 'restart.ico'
$CloseIconPath = Join-Path $RuntimeLauncherIconRoot 'close.ico'
$UpdateIconPath = Join-Path $RuntimeLauncherIconRoot 'update.ico'
$PowerShellIconPath = Join-Path $RuntimeLauncherIconRoot 'powershell.ico'
$OpenShardIconPath = Join-Path $RuntimeLauncherIconRoot 'openshard.ico'
$ControlIconPath = Join-Path $RuntimeLauncherIconRoot 'control.ico'
$ControlStopIconPath = Join-Path $RuntimeLauncherIconRoot 'control-stop.ico'
$GameRoomIconPath = Join-Path $RuntimeLauncherIconRoot 'main.ico'
if (-not (Test-Path -LiteralPath $GameRoomIconPath)) { $GameRoomIconPath = $TrackedGameRoomIconPath }
$ProgramsRoot = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$StartMenuLauncherDirectory = Join-Path $ProgramsRoot 'Halieus Game Room'
$ProjectLauncherDirectory = Join-Path $ProjectRoot 'HGR Launchers'
New-Item -ItemType Directory -Force -Path $ProgramsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $StartMenuLauncherDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $ProjectLauncherDirectory | Out-Null

# These folders are generated launcher collections. Clear prior .lnk files first
# so renames cannot leave stale duplicates behind.
foreach ($LauncherDirectory in @($ProjectLauncherDirectory, $StartMenuLauncherDirectory)) {
    Get-ChildItem -LiteralPath $LauncherDirectory -Filter '*.lnk' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

$StartScript = Join-Path $ProjectRoot 'Start Halieus Game Room.cmd'
$RestartScript = Join-Path $ProjectRoot 'Restart Halieus Game Room.cmd'
$CloseScript = Join-Path $ProjectRoot 'Close Halieus Game Room.cmd'
$UpdateScript = Join-Path $ProjectRoot 'Update Halieus Website.cmd'
$OpenShardScript = Join-Path $ProjectRoot 'scripts\windows\OpenShard-HGR.cmd'
$ControlScript = Join-Path $ProjectRoot 'Start HGR Control.cmd'
$ControlStopScript = Join-Path $ProjectRoot 'Stop HGR Control.cmd'

$LauncherNames = [ordered]@{
    Start = 'HGR - Start.lnk'
    Restart = 'HGR - Restart.lnk'
    Close = 'HGR - Close.lnk'
    Update = 'HGR - Update Site.lnk'
    PowerShell = 'HGR - PowerShell.lnk'
    OpenShard = 'HGR - OpenShard TUI.lnk'
    Control = 'HGR - Control.lnk'
    ControlStop = 'HGR - Stop Control.lnk'
}

$ProjectStartShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Start
$ProjectRestartShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Restart
$ProjectCloseShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Close
$ProjectUpdateShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Update
$ProjectPowerShellShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.PowerShell
$ProjectOpenShardShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.OpenShard
$ProjectControlShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Control
$ProjectControlStopShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.ControlStop

$StartMenuStartShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Start
$StartMenuRestartShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Restart
$StartMenuCloseShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Close
$StartMenuUpdateShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Update
$StartMenuPowerShellShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.PowerShell
$StartMenuOpenShardShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.OpenShard
$StartMenuControlShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Control
$StartMenuControlStopShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.ControlStop
$UpdatePowerShell = Join-Path $ProjectRoot 'update-website.ps1'
$FolderDesktopIni = Join-Path $ProjectRoot 'desktop.ini'

if (-not (Test-Path -LiteralPath $GameRoomIconPath)) {
    throw "Base Halieus icon is missing: $GameRoomIconPath"
}

foreach ($requiredIcon in @(
    $GameRoomIconPath,
    $StartIconPath,
    $RestartIconPath,
    $CloseIconPath,
    $UpdateIconPath,
    $PowerShellIconPath,
    $OpenShardIconPath,
    $ControlIconPath,
    $ControlStopIconPath
)) {
    if (-not (Test-Path -LiteralPath $requiredIcon)) {
        throw "Approved HGR launcher export is missing: $requiredIcon"
    }
    if ((Get-Item -LiteralPath $requiredIcon).Length -le 22) {
        throw "Approved HGR launcher export is empty or invalid: $requiredIcon"
    }
}

$folderIconConfig = @"
[.ShellClassInfo]
IconResource=server\data\runtime\launcher-icons\main.ico,0
IconFile=server\data\runtime\launcher-icons\main.ico
IconIndex=0
InfoTip=Halieus Game Room
[ViewState]
Mode=
Vid=
FolderType=Generic
"@
Set-Content -LiteralPath $FolderDesktopIni -Value $folderIconConfig -Encoding Unicode
attrib +h +s $FolderDesktopIni 2>$null | Out-Null
attrib +r $ProjectRoot 2>$null | Out-Null

$wsh = New-Object -ComObject WScript.Shell
$cmd = if ($env:ComSpec) { $env:ComSpec } else { Join-Path $env:SystemRoot 'System32\cmd.exe' }

function New-HalieusShortcut {
    param(
        [Parameter(Mandatory = $true)][string]$ShortcutPath,
        [Parameter(Mandatory = $true)][string]$CommandScript,
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][string]$IconPath
    )

    $shortcut = $wsh.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $cmd
    $shortcut.Arguments = "/d /c `"`"$CommandScript`"`""
    $shortcut.WorkingDirectory = $ProjectRoot
    $shortcut.Description = $Description
    $shortcut.IconLocation = "$IconPath,0"
    $shortcut.WindowStyle = 1
    $shortcut.Save()
}

function Assert-HalieusShortcutIcon {
    param(
        [Parameter(Mandatory = $true)][string]$ShortcutPath,
        [Parameter(Mandatory = $true)][string]$ExpectedIconPath
    )

    if (-not (Test-Path -LiteralPath $ShortcutPath)) {
        throw "Halieus shortcut is missing during icon verification: $ShortcutPath"
    }

    $check = $wsh.CreateShortcut($ShortcutPath)
    $actualRaw = [string]$check.IconLocation
    $actualPath = ($actualRaw -split ',', 2)[0].Trim().Trim('"')
    $expectedFull = [System.IO.Path]::GetFullPath($ExpectedIconPath)
    $actualFull = [System.IO.Path]::GetFullPath($actualPath)
    if (-not $actualFull.Equals($expectedFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Halieus shortcut icon mismatch: $ShortcutPath expected $expectedFull but found $actualFull"
    }
}

function Assert-HalieusShortcutCommandScript {
    param(
        [Parameter(Mandatory = $true)][string]$ShortcutPath,
        [Parameter(Mandatory = $true)][string]$ExpectedCommandScript
    )

    if (-not (Test-Path -LiteralPath $ShortcutPath)) {
        throw "Halieus shortcut is missing during target verification: $ShortcutPath"
    }

    $check = $wsh.CreateShortcut($ShortcutPath)
    $arguments = [string]$check.Arguments
    if ($arguments.IndexOf($ExpectedCommandScript, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Halieus shortcut target mismatch: $ShortcutPath must route through $ExpectedCommandScript"
    }
}

foreach ($ShortcutRoot in @($ProjectLauncherDirectory, $StartMenuLauncherDirectory)) {
    New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.Start) -CommandScript $StartScript -Description 'Open the Halieus Game Room desktop app window' -IconPath $StartIconPath
    New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.Restart) -CommandScript $RestartScript -Description 'Close and reopen the Halieus Game Room desktop app window' -IconPath $RestartIconPath
    New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.Close) -CommandScript $CloseScript -Description 'Close the local Halieus Game Room desktop app window only' -IconPath $CloseIconPath
    if (Test-Path -LiteralPath $UpdateScript) {
        New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.Update) -CommandScript $UpdateScript -Description 'Validate, sync and deploy the Halieus Game Room website' -IconPath $UpdateIconPath
    }

    $terminal = $wsh.CreateShortcut((Join-Path $ShortcutRoot $LauncherNames.PowerShell))
    $WindowsTerminal = Get-Command wt.exe -ErrorAction SilentlyContinue
    if ($WindowsTerminal) {
        $terminal.TargetPath = $WindowsTerminal.Source
        $terminal.Arguments = "-d `"$ProjectRoot`" --title `"HGR PowerShell`""
    } else {
        $PowerShellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
        $terminal.TargetPath = $PowerShellExe
        $terminal.Arguments = '-NoExit -Command "$Host.UI.RawUI.WindowTitle = ''HGR PowerShell''"'
    }
    $terminal.WorkingDirectory = $ProjectRoot
    $terminal.Description = 'Open PowerShell at the Halieus Game Room project root'
    $terminal.IconLocation = "$PowerShellIconPath,0"
    $terminal.WindowStyle = 1
    $terminal.Save()

    if (-not (Test-Path -LiteralPath $OpenShardScript)) {
        throw "OpenShard HGR helper is missing: $OpenShardScript"
    }
    $openShard = $wsh.CreateShortcut((Join-Path $ShortcutRoot $LauncherNames.OpenShard))
    $openShard.TargetPath = $cmd
    $openShard.Arguments = "/d /c `"`"$OpenShardScript`" tui`""
    $openShard.WorkingDirectory = $ProjectRoot
    $openShard.Description = 'Open the Halieus Game Room OpenShard TUI and receipt dashboard'
    $openShard.IconLocation = "$OpenShardIconPath,0"
    $openShard.WindowStyle = 1
    $openShard.Save()

    if (Test-Path -LiteralPath $ControlScript) {
        New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.Control) -CommandScript $ControlScript -Description 'Start HGR Control in the background and open the private phone pairing route' -IconPath $ControlIconPath
    }
    if (Test-Path -LiteralPath $ControlStopScript) {
        New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.ControlStop) -CommandScript $ControlStopScript -Description 'Stop the background HGR Control service and private phone route' -IconPath $ControlStopIconPath
    }
}

# Remove loose/legacy shortcuts so HGR launchers only live inside the two
# organised launcher folders.
$LooseShortcutNames = @(
    'Start Halieus Game Room.lnk',
    'Restart Halieus Game Room.lnk',
    'Close Halieus Game Room.lnk',
    'Update Halieus Website.lnk',
    'Start HGR App.lnk',
    'Restart HGR App.lnk',
    'Close HGR App.lnk',
    'Update HGR Site.lnk',
    'Update Halieus Game Room.lnk',
    'HGR GitHub Update.lnk',
    'HGR GitHub Sync.lnk',
    'HGR PowerShell.lnk',
    'HGR - OpenShard.lnk',
    'HGR - OpenShard TUI.lnk',
    'HGR - Control Mobile.lnk',
    'Start Mega Board.lnk',
    'Close Mega Board.lnk'
)
foreach ($name in $LooseShortcutNames) {
    Remove-Item -LiteralPath (Join-Path $ProjectRoot $name) -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $ProgramsRoot $name) -Force -ErrorAction SilentlyContinue
}

# Verify every generated shortcut exists before reporting success.
$CreatedShortcuts = @(
    $ProjectStartShortcut,
    $ProjectRestartShortcut,
    $ProjectCloseShortcut,
    $ProjectPowerShellShortcut,
    $ProjectOpenShardShortcut,
    $StartMenuStartShortcut,
    $StartMenuRestartShortcut,
    $StartMenuCloseShortcut,
    $StartMenuPowerShellShortcut,
    $StartMenuOpenShardShortcut
)
if (Test-Path -LiteralPath $ControlScript) {
    $CreatedShortcuts += $ProjectControlShortcut
    $CreatedShortcuts += $StartMenuControlShortcut
}
if (Test-Path -LiteralPath $ControlStopScript) {
    $CreatedShortcuts += $ProjectControlStopShortcut
    $CreatedShortcuts += $StartMenuControlStopShortcut
}
if (Test-Path -LiteralPath $UpdateScript) {
    $CreatedShortcuts += $ProjectUpdateShortcut
    $CreatedShortcuts += $StartMenuUpdateShortcut
}
foreach ($shortcutPath in $CreatedShortcuts) {
    if (-not (Test-Path -LiteralPath $shortcutPath)) {
        throw "Halieus shortcut creation failed: $shortcutPath"
    }
}

# Verify the actual .lnk icon metadata for every generated role, not just that
# the shortcut exists. This catches stale or incorrectly mapped Windows icons.
$ShortcutIconChecks = @(
    [pscustomobject]@{ Shortcut = $ProjectStartShortcut; Icon = $StartIconPath },
    [pscustomobject]@{ Shortcut = $ProjectRestartShortcut; Icon = $RestartIconPath },
    [pscustomobject]@{ Shortcut = $ProjectCloseShortcut; Icon = $CloseIconPath },
    [pscustomobject]@{ Shortcut = $ProjectPowerShellShortcut; Icon = $PowerShellIconPath },
    [pscustomobject]@{ Shortcut = $ProjectOpenShardShortcut; Icon = $OpenShardIconPath },
    [pscustomobject]@{ Shortcut = $StartMenuStartShortcut; Icon = $StartIconPath },
    [pscustomobject]@{ Shortcut = $StartMenuRestartShortcut; Icon = $RestartIconPath },
    [pscustomobject]@{ Shortcut = $StartMenuCloseShortcut; Icon = $CloseIconPath },
    [pscustomobject]@{ Shortcut = $StartMenuPowerShellShortcut; Icon = $PowerShellIconPath },
    [pscustomobject]@{ Shortcut = $StartMenuOpenShardShortcut; Icon = $OpenShardIconPath }
)
if (Test-Path -LiteralPath $ControlScript) {
    $ShortcutIconChecks += [pscustomobject]@{ Shortcut = $ProjectControlShortcut; Icon = $ControlIconPath }
    $ShortcutIconChecks += [pscustomobject]@{ Shortcut = $StartMenuControlShortcut; Icon = $ControlIconPath }
}
if (Test-Path -LiteralPath $ControlStopScript) {
    $ShortcutIconChecks += [pscustomobject]@{ Shortcut = $ProjectControlStopShortcut; Icon = $ControlStopIconPath }
    $ShortcutIconChecks += [pscustomobject]@{ Shortcut = $StartMenuControlStopShortcut; Icon = $ControlStopIconPath }
}
if (Test-Path -LiteralPath $UpdateScript) {
    $ShortcutIconChecks += [pscustomobject]@{ Shortcut = $ProjectUpdateShortcut; Icon = $UpdateIconPath }
    $ShortcutIconChecks += [pscustomobject]@{ Shortcut = $StartMenuUpdateShortcut; Icon = $UpdateIconPath }
}
foreach ($check in $ShortcutIconChecks) {
    Assert-HalieusShortcutIcon -ShortcutPath $check.Shortcut -ExpectedIconPath $check.Icon
}

# Control launchers must point at canonical user-facing entry points. Legacy
# *Control Mobile* wrappers may remain internally for compatibility, but they
# are not allowed to leak into generated shortcut targets.
if (Test-Path -LiteralPath $ControlScript) {
    Assert-HalieusShortcutCommandScript -ShortcutPath $ProjectControlShortcut -ExpectedCommandScript $ControlScript
    Assert-HalieusShortcutCommandScript -ShortcutPath $StartMenuControlShortcut -ExpectedCommandScript $ControlScript
}
if (Test-Path -LiteralPath $ControlStopScript) {
    Assert-HalieusShortcutCommandScript -ShortcutPath $ProjectControlStopShortcut -ExpectedCommandScript $ControlStopScript
    Assert-HalieusShortcutCommandScript -ShortcutPath $StartMenuControlStopShortcut -ExpectedCommandScript $ControlStopScript
}

# Nudge Windows to re-read shortcut artwork after the icon paths change.
$IconRefresh = Join-Path $env:SystemRoot 'System32\ie4uinit.exe'
if (Test-Path -LiteralPath $IconRefresh) {
    try { Start-Process -FilePath $IconRefresh -ArgumentList '-ClearIconCache' -WindowStyle Hidden -Wait -ErrorAction Stop } catch {}
    try { Start-Process -FilePath $IconRefresh -ArgumentList '-show' -WindowStyle Hidden -Wait -ErrorAction Stop } catch {}
}

Write-Host ''
Write-Host 'HGR launcher family refreshed and verified against generated icon metadata:' -ForegroundColor Cyan
Write-Host "  Project:    $ProjectLauncherDirectory" -ForegroundColor DarkGray
Write-Host "  Start Menu: $StartMenuLauncherDirectory" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'All HGR shortcuts now use the same grouped layout and canonical naming.' -ForegroundColor Green

if ($UnhideScripts) {
    attrib -h $StartScript 2>$null | Out-Null
    attrib -h $RestartScript 2>$null | Out-Null
    attrib -h $CloseScript 2>$null | Out-Null
    if (Test-Path -LiteralPath $UpdateScript) { attrib -h $UpdateScript 2>$null | Out-Null }
    if (Test-Path -LiteralPath $UpdatePowerShell) { attrib -h $UpdatePowerShell 2>$null | Out-Null }
} else {
    attrib +h $StartScript 2>$null | Out-Null
    attrib +h $RestartScript 2>$null | Out-Null
    attrib +h $CloseScript 2>$null | Out-Null
    if (Test-Path -LiteralPath $UpdateScript) { attrib +h $UpdateScript 2>$null | Out-Null }
    if (Test-Path -LiteralPath $UpdatePowerShell) { attrib +h $UpdatePowerShell 2>$null | Out-Null }
}
