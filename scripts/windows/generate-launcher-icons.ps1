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
$BrandingRevision = 'r3'
New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null
Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.ico' -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

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
        $surface = [System.Drawing.ColorTranslator]::FromHtml('#20252D')
        $surfaceRaised = [System.Drawing.ColorTranslator]::FromHtml('#2A303A')
        $warmGold = [System.Drawing.ColorTranslator]::FromHtml('#E7C15B')
        $white = [System.Drawing.Color]::FromArgb(245, 247, 250)

        # Soft outer shadow.
        $shadow = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(20, 24, 216, 216)) -Radius 38
        $graphics.FillPath(([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(52, 0, 0, 0))), $shadow)

        # Main dark HGR tile.
        $outer = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(18, 18, 216, 216)) -Radius 38
        $graphics.FillPath(([System.Drawing.SolidBrush]::new($surface)), $outer)

        # Raised inner surface; deliberately no black cap or high-contrast split.
        $inner = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(30, 30, 192, 176)) -Radius 29
        $graphics.FillPath(([System.Drawing.SolidBrush]::new($surfaceRaised)), $inner)

        # Muted action colour appears as a slim border and footer accent.
        $pen = [System.Drawing.Pen]::new($accent, 7)
        try {
            $graphics.DrawPath($pen, $outer)
        } finally {
            $pen.Dispose()
        }

        $accentBar = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(52, 208, 152, 11)) -Radius 5
        $graphics.FillPath(([System.Drawing.SolidBrush]::new($accent)), $accentBar)

        $fontFamily = [System.Drawing.FontFamily]::new('Arial')
        $font = [System.Drawing.Font]::new($fontFamily, 104, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        try {
            $hColor = if ($WhiteH) { $white } else { $warmGold }
            $hBrush = [System.Drawing.SolidBrush]::new($hColor)
            $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(58, 0, 0, 0))
            try {
                $format = [System.Drawing.StringFormat]::new()
                $format.Alignment = [System.Drawing.StringAlignment]::Center
                $format.LineAlignment = [System.Drawing.StringAlignment]::Center

                $graphics.DrawString('H', $font, $shadowBrush, ([System.Drawing.RectangleF]::new(61, 59, 138, 134)), $format)
                $graphics.DrawString('H', $font, $hBrush, ([System.Drawing.RectangleF]::new(58, 56, 138, 134)), $format)
            } finally {
                $hBrush.Dispose()
                $shadowBrush.Dispose()
            }
        } finally {
            $font.Dispose()
            $fontFamily.Dispose()
        }

        if ($PowerShellBadge) {
            $badge = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(158, 166, 70, 48)) -Radius 12
            $graphics.FillPath(([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 45, 54, 66))), $badge)

            $badgePen = [System.Drawing.Pen]::new($accent, 3)
            try {
                $graphics.DrawPath($badgePen, $badge)
            } finally {
                $badgePen.Dispose()
            }

            $badgeFont = [System.Drawing.Font]::new('Consolas', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $badgeBrush = [System.Drawing.SolidBrush]::new($white)
            try {
                $graphics.DrawString('>_', $badgeFont, $badgeBrush, 166, 174)
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

New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Start Halieus Game Room-$BrandingRevision.ico") -AccentHex '#3F7D62'
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Restart Halieus Game Room-$BrandingRevision.ico") -AccentHex '#B47A35'
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Close Halieus Game Room-$BrandingRevision.ico") -AccentHex '#A94F55' -WhiteH
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Update Halieus Website-$BrandingRevision.ico") -AccentHex '#4C6F9F'
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "HGR PowerShell-$BrandingRevision.ico") -AccentHex '#4A6178' -PowerShellBadge

Write-Host 'HGR launcher icons generated successfully.'
