param(
    [switch]$UnhideScripts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$GameRoomIconPath = Join-Path $ProjectRoot 'Halieus Game Room.ico'
$StartIconPath = Join-Path $ProjectRoot 'Start Halieus Game Room.ico'
$RestartIconPath = Join-Path $ProjectRoot 'Restart Halieus Game Room.ico'
$UpdateIconPath = Join-Path $ProjectRoot 'Update Halieus Website.ico'
$CloseIconPath = Join-Path $ProjectRoot 'Close Halieus Game Room.ico'
$StartScript = Join-Path $ProjectRoot 'Start Halieus Game Room.cmd'
$StartShortcut = Join-Path $ProjectRoot 'Start Halieus Game Room.lnk'
$RestartScript = Join-Path $ProjectRoot 'Restart Halieus Game Room.cmd'
$RestartShortcut = Join-Path $ProjectRoot 'Restart Halieus Game Room.lnk'
$CloseScript = Join-Path $ProjectRoot 'Close Halieus Game Room.cmd'
$CloseShortcut = Join-Path $ProjectRoot 'Close Halieus Game Room.lnk'
$UpdateScript = Join-Path $ProjectRoot 'Update Halieus Website.cmd'
$UpdateShortcut = Join-Path $ProjectRoot 'Update Halieus Website.lnk'
$UpdatePowerShell = Join-Path $ProjectRoot 'update-website.ps1'
$FolderDesktopIni = Join-Path $ProjectRoot 'desktop.ini'

foreach ($requiredIcon in @($GameRoomIconPath, $StartIconPath, $RestartIconPath, $UpdateIconPath, $CloseIconPath)) {
    if (-not (Test-Path -LiteralPath $requiredIcon)) {
        throw "Required Halieus launcher icon is missing: $requiredIcon. Re-extract the release."
    }
}

$folderIconConfig = @"
[.ShellClassInfo]
IconResource=Halieus Game Room.ico,0
IconFile=Halieus Game Room.ico
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
    New-HalieusShortcut -ShortcutPath $UpdateShortcut -CommandScript $UpdateScript -Description 'Publish the current Halieus Game Room release to the website' -IconPath $UpdateIconPath
}

# Remove obsolete shortcut names from pre-platform releases if they are still present after an in-place update.
Remove-Item -LiteralPath (Join-Path $ProjectRoot 'Start Mega Board.lnk') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $ProjectRoot 'Close Mega Board.lnk') -Force -ErrorAction SilentlyContinue

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
