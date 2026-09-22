param(
    [switch]$UnhideScripts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$IconGenerator = Join-Path $PSScriptRoot 'generate-launcher-icons.ps1'
if (-not (Test-Path -LiteralPath $IconGenerator)) {
    throw "Required HGR icon generator is missing: $IconGenerator"
}
& $IconGenerator

$GameRoomIconPath = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.ico'
$LauncherIconRoot = Join-Path $ProjectRoot 'assets\branding\launchers'
$BrandingRevision = 'r4'
$StartIconPath = Join-Path $LauncherIconRoot "Start Halieus Game Room-$BrandingRevision.ico"
$RestartIconPath = Join-Path $LauncherIconRoot "Restart Halieus Game Room-$BrandingRevision.ico"
$CloseIconPath = Join-Path $LauncherIconRoot "Close Halieus Game Room-$BrandingRevision.ico"
$UpdateIconPath = Join-Path $LauncherIconRoot "Update Halieus Website-$BrandingRevision.ico"
$PowerShellIconPath = Join-Path $LauncherIconRoot "HGR PowerShell-$BrandingRevision.ico"
$ShortcutDirectory = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Halieus Game Room'
New-Item -ItemType Directory -Force -Path $ShortcutDirectory | Out-Null
$StartScript = Join-Path $ProjectRoot 'Start Halieus Game Room.cmd'
$StartShortcut = Join-Path $ShortcutDirectory 'Start Halieus Game Room.lnk'
$RestartScript = Join-Path $ProjectRoot 'Restart Halieus Game Room.cmd'
$RestartShortcut = Join-Path $ShortcutDirectory 'Restart Halieus Game Room.lnk'
$CloseScript = Join-Path $ProjectRoot 'Close Halieus Game Room.cmd'
$CloseShortcut = Join-Path $ShortcutDirectory 'Close Halieus Game Room.lnk'
$UpdateScript = Join-Path $ProjectRoot 'Update HGR GitHub.cmd'
$UpdateShortcut = Join-Path $ShortcutDirectory 'Update Halieus Website.lnk'
$PowerShellShortcut = Join-Path $ShortcutDirectory 'HGR PowerShell.lnk'
$UpdatePowerShell = Join-Path $ProjectRoot 'update-website.ps1'
$FolderDesktopIni = Join-Path $ProjectRoot 'desktop.ini'

foreach ($requiredIcon in @($GameRoomIconPath, $StartIconPath, $RestartIconPath, $UpdateIconPath, $CloseIconPath, $PowerShellIconPath)) {
    if (-not (Test-Path -LiteralPath $requiredIcon)) {
        throw "Required Halieus launcher icon is missing: $requiredIcon. Re-extract the release."
    }
}

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

New-HalieusShortcut -ShortcutPath $StartShortcut -CommandScript $StartScript -Description 'Start Halieus Game Room' -IconPath $StartIconPath
New-HalieusShortcut -ShortcutPath $RestartShortcut -CommandScript $RestartScript -Description 'Restart Halieus Game Room' -IconPath $RestartIconPath
New-HalieusShortcut -ShortcutPath $CloseShortcut -CommandScript $CloseScript -Description 'Close Halieus Game Room' -IconPath $CloseIconPath
if (Test-Path -LiteralPath $UpdateScript) {
    New-HalieusShortcut -ShortcutPath $UpdateShortcut -CommandScript $UpdateScript -Description 'Validate, sync and deploy Halieus Game Room' -IconPath $UpdateIconPath
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

# Nudge Windows to re-read shortcut artwork after the icon paths change.
$IconRefresh = Join-Path $env:SystemRoot 'System32\ie4uinit.exe'
if (Test-Path -LiteralPath $IconRefresh) {
    try { Start-Process -FilePath $IconRefresh -ArgumentList '-show' -WindowStyle Hidden -Wait -ErrorAction Stop } catch {}
}

# Shortcuts belong in the Start Menu. Remove old generated root shortcuts so
# the source folder stays readable and moving helpers cannot leave stale links.
foreach ($name in @(
    'Start Halieus Game Room.lnk',
    'Restart Halieus Game Room.lnk',
    'Close Halieus Game Room.lnk',
    'Update Halieus Website.lnk',
    'Update Halieus Game Room.lnk',
    'HGR GitHub Update.lnk',
    'HGR GitHub Sync.lnk',
    'HGR PowerShell.lnk',
    'Start Mega Board.lnk',
    'Close Mega Board.lnk'
)) {
    Remove-Item -LiteralPath (Join-Path $ProjectRoot $name) -Force -ErrorAction SilentlyContinue
}

# These two icons used to live in the root. The tracked branding copies now
# own the shortcut/folder artwork, so stale local copies can be removed safely.
foreach ($legacyIcon in @('Halieus Game Room.ico', 'Update Halieus Website.ico')) {
    Remove-Item -LiteralPath (Join-Path $ProjectRoot $legacyIcon) -Force -ErrorAction SilentlyContinue
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
