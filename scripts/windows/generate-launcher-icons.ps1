Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class HgrNativeIcon {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool DestroyIcon(IntPtr handle);
}
"@

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LauncherRoot = Join-Path $ProjectRoot 'assets\branding\launchers'
New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null

function New-RoundedRectanglePath {
    param(
        [System.Drawing.RectangleF]$Rect,
        [float]$Radius
    )

    $diameter = $Radius * 2
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($Rect.X, $Rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($Rect.Right - $diameter, $Rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($Rect.Right - $diameter, $Rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($Rect.X, $Rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Save-BitmapAsIcon {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $handle = $Bitmap.GetHicon()
    try {
        $icon = [System.Drawing.Icon]::FromHandle($handle)
        $stream = [System.IO.File]::Create($Path)
        try {
            $icon.Save($stream)
        } finally {
            $stream.Dispose()
            $icon.Dispose()
        }
    } finally {
        [void][HgrNativeIcon]::DestroyIcon($handle)
    }
}

function New-HgrLauncherIcon {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$AccentHex,
        [switch]$WhiteH,
        [switch]$PowerShellBadge
    )

    $size = 256
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $accent = [System.Drawing.ColorTranslator]::FromHtml($AccentHex)
        $dark = [System.Drawing.ColorTranslator]::FromHtml('#242424')
        $white = [System.Drawing.Color]::White
        $gold = [System.Drawing.ColorTranslator]::FromHtml('#F6C945')
        $badgeGrey = [System.Drawing.ColorTranslator]::FromHtml('#A7A7A7')

        $outer = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(17, 17, 222, 222)) -Radius 34
        $graphics.FillPath(([System.Drawing.SolidBrush]::new($accent)), $outer)

        $top = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(22, 22, 212, 105)) -Radius 30
        $graphics.FillPath(([System.Drawing.SolidBrush]::new($dark)), $top)

        $bottomBar = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(28, 201, 200, 28)) -Radius 14
        $graphics.FillPath(([System.Drawing.SolidBrush]::new($dark)), $bottomBar)

        $fontFamily = [System.Drawing.FontFamily]::new('Arial')
        $font = [System.Drawing.Font]::new($fontFamily, 92, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        try {
            $hColor = if ($WhiteH) { $white } else { $gold }
            $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(75, 0, 0, 0))
            $hBrush = [System.Drawing.SolidBrush]::new($hColor)
            try {
                $format = [System.Drawing.StringFormat]::new()
                $format.Alignment = [System.Drawing.StringAlignment]::Center
                $format.LineAlignment = [System.Drawing.StringAlignment]::Center
                $graphics.DrawString('H', $font, $shadowBrush, ([System.Drawing.RectangleF]::new(77, 79, 110, 118)), $format)
                $graphics.DrawString('H', $font, $hBrush, ([System.Drawing.RectangleF]::new(73, 75, 110, 118)), $format)
            } finally {
                $shadowBrush.Dispose()
                $hBrush.Dispose()
            }
        } finally {
            $font.Dispose()
            $fontFamily.Dispose()
        }

        if ($PowerShellBadge) {
            $badge = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(168, 171, 76, 58)) -Radius 12
            $graphics.FillPath(([System.Drawing.SolidBrush]::new($badgeGrey)), $badge)
            $badgeFont = [System.Drawing.Font]::new('Consolas', 31, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $badgeBrush = [System.Drawing.SolidBrush]::new($white)
            try {
                $graphics.DrawString('>_', $badgeFont, $badgeBrush, 177, 181)
            } finally {
                $badgeFont.Dispose()
                $badgeBrush.Dispose()
            }
        }

        Save-BitmapAsIcon -Bitmap $bitmap -Path $Path
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-HgrLauncherIcon -Path (Join-Path $LauncherRoot 'Start Halieus Game Room.ico') -AccentHex '#16A34A'
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot 'Restart Halieus Game Room.ico') -AccentHex '#F97316'
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot 'Close Halieus Game Room.ico') -AccentHex '#DC2626' -WhiteH
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot 'Update Halieus Website.ico') -AccentHex '#2563EB'
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot 'HGR PowerShell.ico') -AccentHex '#0F4C81' -PowerShellBadge

Write-Host 'HGR launcher icons generated successfully.'
