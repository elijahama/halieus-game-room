param(
    [switch]$UnhideScripts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# IMPORTANT: shortcut refresh is non-destructive.
# It must never generate, delete, recolour or overwrite launcher artwork.
$GameRoomIconPath = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.ico'
$LauncherIconRoot = Join-Path $ProjectRoot 'assets\branding\launchers\matte'
$StartIconPath = Join-Path $LauncherIconRoot 'Start Halieus Game Room.ico'
$RestartIconPath = Join-Path $LauncherIconRoot 'Restart Halieus Game Room.ico'
$CloseIconPath = Join-Path $LauncherIconRoot 'Close Halieus Game Room.ico'
$UpdateIconPath = Join-Path $LauncherIconRoot 'Update Halieus Website.ico'
$PowerShellIconPath = Join-Path $LauncherIconRoot 'HGR PowerShell.ico'
$ProgramsRoot = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$LegacyShortcutDirectory = Join-Path $ProgramsRoot 'Halieus Game Room'
New-Item -ItemType Directory -Force -Path $ProgramsRoot | Out-Null

# Windows Search/Pin-to-Start is most reliable when these utility shortcuts sit
# directly in the user's Programs root rather than inside an extra nested folder.
$ShortcutDirectory = $ProgramsRoot
$StartScript = Join-Path $ProjectRoot 'Start Halieus Game Room.cmd'
$StartShortcut = Join-Path $ShortcutDirectory 'Start HGR App.lnk'
$RestartScript = Join-Path $ProjectRoot 'Restart Halieus Game Room.cmd'
$RestartShortcut = Join-Path $ShortcutDirectory 'Restart HGR App.lnk'
$CloseScript = Join-Path $ProjectRoot 'Close Halieus Game Room.cmd'
$CloseShortcut = Join-Path $ShortcutDirectory 'Close HGR App.lnk'
$UpdateScript = Join-Path $ProjectRoot 'Update Halieus Website.cmd'
$UpdateShortcut = Join-Path $ShortcutDirectory 'Update HGR Site.lnk'
$PowerShellShortcut = Join-Path $ShortcutDirectory 'HGR PowerShell.lnk'
$OpenShardShortcut = Join-Path $ShortcutDirectory 'HGR - OpenShard.lnk'
$OpenShardScript = Join-Path $ProjectRoot 'scripts\windows\OpenShard-HGR.cmd'
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

$StartIconPath = Resolve-HalieusIconPath -Preferred $StartIconPath -Fallback $GameRoomIconPath -Label 'Start'
$RestartIconPath = Resolve-HalieusIconPath -Preferred $RestartIconPath -Fallback $GameRoomIconPath -Label 'Restart'
$CloseIconPath = Resolve-HalieusIconPath -Preferred $CloseIconPath -Fallback $GameRoomIconPath -Label 'Close'
$UpdateIconPath = Resolve-HalieusIconPath -Preferred $UpdateIconPath -Fallback $GameRoomIconPath -Label 'Update'
$PowerShellIconPath = Resolve-HalieusIconPath -Preferred $PowerShellIconPath -Fallback $GameRoomIconPath -Label 'PowerShell'

$folderIconConfig = @"
[.ShellClassInfo]
IconResource=assets\branding\Halieus Game Room.ico,0
IconFile=assets\branding\Halieus Game Room.ico
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

New-HalieusShortcut -ShortcutPath $StartShortcut -CommandScript $StartScript -Description 'Open the Halieus Game Room desktop app window' -IconPath $StartIconPath
New-HalieusShortcut -ShortcutPath $RestartShortcut -CommandScript $RestartScript -Description 'Close and reopen the Halieus Game Room desktop app window' -IconPath $RestartIconPath
New-HalieusShortcut -ShortcutPath $CloseShortcut -CommandScript $CloseScript -Description 'Close the local Halieus Game Room desktop app window only' -IconPath $CloseIconPath
if (Test-Path -LiteralPath $UpdateScript) {
    New-HalieusShortcut -ShortcutPath $UpdateShortcut -CommandScript $UpdateScript -Description 'Validate, sync and deploy the Halieus Game Room website' -IconPath $UpdateIconPath
}

$terminal = $wsh.CreateShortcut($PowerShellShortcut)
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

# OpenShard is development-only tooling. Reuse the current terminal launcher
# artwork until the HGR visual model sheet defines the final launcher family.
if (-not (Test-Path -LiteralPath $OpenShardScript)) {
    throw "OpenShard HGR helper is missing: $OpenShardScript"
}
$openShard = $wsh.CreateShortcut($OpenShardShortcut)
$openShard.TargetPath = $cmd
$openShard.Arguments = "/d /c `"`"$OpenShardScript`" tui`""
$openShard.WorkingDirectory = $ProjectRoot
$openShard.Description = 'Open the Halieus Game Room OpenShard receipt dashboard'
$openShard.IconLocation = "$PowerShellIconPath,0"
$openShard.WindowStyle = 1
$openShard.Save()

# Remove the older nested Start Menu copies so Search does not show duplicates.
if (Test-Path -LiteralPath $LegacyShortcutDirectory) {
    Get-ChildItem -LiteralPath $LegacyShortcutDirectory -Filter '*.lnk' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
    try { Remove-Item -LiteralPath $LegacyShortcutDirectory -Force -ErrorAction Stop } catch {}
}

# Verify every Start Menu entry exists before reporting success.
$CreatedShortcuts = @(
    $StartShortcut,
    $RestartShortcut,
    $CloseShortcut,
    $UpdateShortcut,
    $PowerShellShortcut,
    $OpenShardShortcut
)
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
Write-Host 'Start Menu shortcuts refreshed without touching launcher artwork:' -ForegroundColor Cyan
foreach ($shortcutPath in $CreatedShortcuts) {
    Write-Host "  $shortcutPath" -ForegroundColor DarkGray
}
Write-Host 'Search these names in Start, then choose Pin to Start.' -ForegroundColor Green

# Shortcuts belong in the Start Menu. Remove old generated root shortcuts so
# the source folder stays readable and moving helpers cannot leave stale links.
foreach ($name in @(
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
    'Start Mega Board.lnk',
    'Close Mega Board.lnk'
)) {
    Remove-Item -LiteralPath (Join-Path $ProjectRoot $name) -Force -ErrorAction SilentlyContinue
}

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
