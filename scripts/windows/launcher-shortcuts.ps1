param(
    [switch]$UnhideScripts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# Shortcut refresh regenerates runtime ICO/PNG artwork from the canonical
# Halieus role palette. Tracked source artwork is never overwritten here.
$TrackedGameRoomIconPath = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.ico'
$RuntimeLauncherIconRoot = Join-Path $ProjectRoot 'server\data\runtime\launcher-icons'
$TrackedLauncherIconRoot = Join-Path $ProjectRoot 'client\public\brand\launcher'
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
$ControlMobileScript = Join-Path $ProjectRoot 'Start HGR Control Mobile.cmd'

$LauncherNames = [ordered]@{
    Start = 'HGR - Start.lnk'
    Restart = 'HGR - Restart.lnk'
    Close = 'HGR - Close.lnk'
    Update = 'HGR - Update Site.lnk'
    PowerShell = 'HGR - PowerShell.lnk'
    OpenShard = 'HGR - OpenShard TUI.lnk'
    ControlMobile = 'HGR - Control Mobile.lnk'
}

$ProjectStartShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Start
$ProjectRestartShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Restart
$ProjectCloseShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Close
$ProjectUpdateShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.Update
$ProjectPowerShellShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.PowerShell
$ProjectOpenShardShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.OpenShard
$ProjectControlMobileShortcut = Join-Path $ProjectLauncherDirectory $LauncherNames.ControlMobile

$StartMenuStartShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Start
$StartMenuRestartShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Restart
$StartMenuCloseShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Close
$StartMenuUpdateShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.Update
$StartMenuPowerShellShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.PowerShell
$StartMenuOpenShardShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.OpenShard
$StartMenuControlMobileShortcut = Join-Path $StartMenuLauncherDirectory $LauncherNames.ControlMobile
$UpdatePowerShell = Join-Path $ProjectRoot 'update-website.ps1'
$FolderDesktopIni = Join-Path $ProjectRoot 'desktop.ini'

if (-not (Test-Path -LiteralPath $GameRoomIconPath)) {
    throw "Base Halieus icon is missing: $GameRoomIconPath"
}

function Resolve-HalieusIconPath {
    param(
        [Parameter(Mandatory = $true)][string]$Preferred,
        [Parameter(Mandatory = $true)][string]$Fallback,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (Test-Path -LiteralPath $Preferred) {
        return $Preferred
    }

    Write-Host "Custom $Label icon not found; using the base Halieus icon without modifying any files." -ForegroundColor DarkYellow
    return $Fallback
}

$StartIconPath = Resolve-HalieusIconPath -Preferred $StartIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'start.ico') -Label 'Start'
$RestartIconPath = Resolve-HalieusIconPath -Preferred $RestartIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'restart.ico') -Label 'Restart'
$CloseIconPath = Resolve-HalieusIconPath -Preferred $CloseIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'close.ico') -Label 'Close'
$UpdateIconPath = Resolve-HalieusIconPath -Preferred $UpdateIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'update.ico') -Label 'Update'
$PowerShellIconPath = Resolve-HalieusIconPath -Preferred $PowerShellIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'powershell.ico') -Label 'PowerShell'
$OpenShardIconPath = Resolve-HalieusIconPath -Preferred $OpenShardIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'openshard.ico') -Label 'OpenShard TUI'
$ControlIconPath = Resolve-HalieusIconPath -Preferred $ControlIconPath -Fallback (Join-Path $TrackedLauncherIconRoot 'control.ico') -Label 'Control'

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

    if (Test-Path -LiteralPath $ControlMobileScript) {
        New-HalieusShortcut -ShortcutPath (Join-Path $ShortcutRoot $LauncherNames.ControlMobile) -CommandScript $ControlMobileScript -Description 'Open the private HGR Control Mobile service for the owner phone' -IconPath $ControlIconPath
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
    'Start Mega Board.lnk',
    'Close Mega Board.lnk'
)
foreach ($name in $LooseShortcutNames) {
    Remove-Item -LiteralPath (Join-Path $ProjectRoot $name) -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $ProgramsRoot $name) -Force -ErrorAction SilentlyContinue
}

# Verify every Start Menu entry exists before reporting success.
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
if (Test-Path -LiteralPath $ControlMobileScript) {
    $CreatedShortcuts += $ProjectControlMobileShortcut
    $CreatedShortcuts += $StartMenuControlMobileShortcut
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

# Nudge Windows to re-read shortcut artwork after the icon paths change.
$IconRefresh = Join-Path $env:SystemRoot 'System32\ie4uinit.exe'
if (Test-Path -LiteralPath $IconRefresh) {
    try { Start-Process -FilePath $IconRefresh -ArgumentList '-show' -WindowStyle Hidden -Wait -ErrorAction Stop } catch {}
}

Write-Host ''
Write-Host 'HGR launcher family refreshed without touching launcher artwork:' -ForegroundColor Cyan
Write-Host "  Project:    $ProjectLauncherDirectory" -ForegroundColor DarkGray
Write-Host "  Start Menu: $StartMenuLauncherDirectory" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'All HGR shortcuts now use the same grouped layout and naming.' -ForegroundColor Green

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
