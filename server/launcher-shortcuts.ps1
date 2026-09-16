param(
    [switch]$UnhideScripts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$GameRoomIconPath = Join-Path $ProjectRoot 'Halieus Game Room.ico'
$StartScript = Join-Path $ProjectRoot 'Start Halieus Game Room.cmd'
$StopScript = Join-Path $ProjectRoot 'Close Halieus Game Room.cmd'
$StartShortcut = Join-Path $ProjectRoot 'Start Halieus Game Room.lnk'
$StopShortcut = Join-Path $ProjectRoot 'Close Halieus Game Room.lnk'
$FolderDesktopIni = Join-Path $ProjectRoot 'desktop.ini'

if (-not (Test-Path -LiteralPath $GameRoomIconPath)) {
    throw 'Halieus Game Room.ico is missing. Re-extract the release so the application folder and launchers keep the Halieus H icon.'
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
        [Parameter(Mandatory = $true)][string]$Description
    )

    $shortcut = $wsh.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $cmd
    $shortcut.Arguments = "/d /c `"`"$CommandScript`"`""
    $shortcut.WorkingDirectory = $ProjectRoot
    $shortcut.Description = $Description
    $shortcut.IconLocation = "$GameRoomIconPath,0"
    $shortcut.WindowStyle = 1
    $shortcut.Save()
}

New-HalieusShortcut -ShortcutPath $StartShortcut -CommandScript $StartScript -Description 'Start Halieus Game Room'
New-HalieusShortcut -ShortcutPath $StopShortcut -CommandScript $StopScript -Description 'Close Halieus Game Room'

# Remove obsolete shortcut names from pre-platform releases if they are still present after an in-place update.
Remove-Item -LiteralPath (Join-Path $ProjectRoot 'Start Mega Board.lnk') -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (Join-Path $ProjectRoot 'Close Mega Board.lnk') -Force -ErrorAction SilentlyContinue

if ($UnhideScripts) {
    attrib -h $StartScript 2>$null | Out-Null
    attrib -h $StopScript 2>$null | Out-Null
} else {
    attrib +h $StartScript 2>$null | Out-Null
    attrib +h $StopScript 2>$null | Out-Null
}
