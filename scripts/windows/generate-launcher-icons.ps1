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
$BrandingRevision = 'r4'
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

function Get-Color {
    param([Parameter(Mandatory = $true)][string]$Hex)
    return [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function New-HgrLauncherIcon {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$TopHex,
        [Parameter(Mandatory = $true)][string]$BaseHex,
        [Parameter(Mandatory = $true)][string]$BottomHex,
        [Parameter(Mandatory = $true)][string]$RimHex,
        [switch]$PowerShellBadge
    )

    $size = 256
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $top = Get-Color $TopHex
        $base = Get-Color $BaseHex
        $bottom = Get-Color $BottomHex
        $rim = Get-Color $RimHex
        $navy = Get-Color '#18253D'
        $badgeSurface = Get-Color '#243247'
        $badgeText = [System.Drawing.Color]::FromArgb(248, 250, 252)

        # Soft drop shadow underneath the glossy tile.
        $shadowPath = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(24, 27, 208, 216)) -Radius 46
        $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(74, 0, 0, 0))
        try {
            $graphics.FillPath($shadowBrush, $shadowPath)
        } finally {
            $shadowBrush.Dispose()
            $shadowPath.Dispose()
        }

        # Main rounded Halieus pillow tile.
        $tileRect = [System.Drawing.RectangleF]::new(20, 14, 216, 220)
        $tilePath = New-RoundedRectanglePath -Rect $tileRect -Radius 48

        $tileGradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $tileRect,
            $top,
            $bottom,
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        $blend = [System.Drawing.Drawing2D.ColorBlend]::new()
        $blend.Colors = [System.Drawing.Color[]]@($top, $base, $bottom)
        $blend.Positions = [single[]]@(0.0, 0.48, 1.0)
        $tileGradient.InterpolationColors = $blend

        try {
            $graphics.FillPath($tileGradient, $tilePath)
        } finally {
            $tileGradient.Dispose()
        }

        # Darker rim: this is the equivalent of the gold/orange border on the
        # main Halieus icon, but tinted to each launcher action.
        $rimPen = [System.Drawing.Pen]::new($rim, 8)
        $rimPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        try {
            $graphics.DrawPath($rimPen, $tilePath)
        } finally {
            $rimPen.Dispose()
        }

        # Glossy top highlight, clipped inside the tile so it feels like the
        # existing Halieus app icon rather than a flat utility glyph.
        $state = $graphics.Save()
        try {
            $graphics.SetClip($tilePath)
            $glossRect = [System.Drawing.RectangleF]::new(32, 28, 192, 96)
            $glossPath = New-RoundedRectanglePath -Rect $glossRect -Radius 38
            $glossBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
                $glossRect,
                [System.Drawing.Color]::FromArgb(125, 255, 255, 255),
                [System.Drawing.Color]::FromArgb(8, 255, 255, 255),
                [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
            )
            try {
                $graphics.FillPath($glossBrush, $glossPath)
            } finally {
                $glossBrush.Dispose()
                $glossPath.Dispose()
            }

            # Slight lower shading adds the same chunky depth as the main icon.
            $shadeRect = [System.Drawing.RectangleF]::new(26, 150, 204, 80)
            $shadeBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
                $shadeRect,
                [System.Drawing.Color]::FromArgb(0, 0, 0, 0),
                [System.Drawing.Color]::FromArgb(42, 0, 0, 0),
                [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
            )
            try {
                $graphics.FillRectangle($shadeBrush, $shadeRect)
            } finally {
                $shadeBrush.Dispose()
            }
        } finally {
            $graphics.Restore($state)
        }

        # Central navy H mirrors the primary Halieus mark.
        $fontFamily = [System.Drawing.FontFamily]::new('Arial')
        $font = [System.Drawing.Font]::new($fontFamily, 112, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        try {
            $hBrush = [System.Drawing.SolidBrush]::new($navy)
            $hShadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 255, 255, 255))
            try {
                $format = [System.Drawing.StringFormat]::new()
                $format.Alignment = [System.Drawing.StringAlignment]::Center
                $format.LineAlignment = [System.Drawing.StringAlignment]::Center

                $graphics.DrawString('H', $font, $hShadowBrush, ([System.Drawing.RectangleF]::new(58, 61, 144, 140)), $format)
                $graphics.DrawString('H', $font, $hBrush, ([System.Drawing.RectangleF]::new(56, 59, 144, 140)), $format)
            } finally {
                $hBrush.Dispose()
                $hShadowBrush.Dispose()
                $format.Dispose()
            }
        } finally {
            $font.Dispose()
            $fontFamily.Dispose()
        }

        if ($PowerShellBadge) {
            $badgeRect = [System.Drawing.RectangleF]::new(158, 168, 72, 48)
            $badgePath = New-RoundedRectanglePath -Rect $badgeRect -Radius 12
            $badgeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, $badgeSurface.R, $badgeSurface.G, $badgeSurface.B))
            $badgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 255, 255, 255), 2)
            try {
                $graphics.FillPath($badgeBrush, $badgePath)
                $graphics.DrawPath($badgePen, $badgePath)
            } finally {
                $badgeBrush.Dispose()
                $badgePen.Dispose()
                $badgePath.Dispose()
            }

            $badgeFont = [System.Drawing.Font]::new('Consolas', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $badgeTextBrush = [System.Drawing.SolidBrush]::new($badgeText)
            try {
                $graphics.DrawString('>_', $badgeFont, $badgeTextBrush, 165, 176)
            } finally {
                $badgeFont.Dispose()
                $badgeTextBrush.Dispose()
            }
        }

        Save-BitmapAsIcon -Bitmap $bitmap -Path $Path
        $tilePath.Dispose()
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

# r4 follows the actual Halieus app-icon language: glossy rounded pillow,
# darker rim, central navy H, and action colour in the body itself.
New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Start Halieus Game Room-$BrandingRevision.ico") `
    -TopHex '#69D28C' -BaseHex '#3FAE63' -BottomHex '#248B48' -RimHex '#1D6C39'

New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Restart Halieus Game Room-$BrandingRevision.ico") `
    -TopHex '#F7C766' -BaseHex '#D89A34' -BottomHex '#B66B19' -RimHex '#945616'

New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Close Halieus Game Room-$BrandingRevision.ico") `
    -TopHex '#F0837E' -BaseHex '#D45656' -BottomHex '#AA343C' -RimHex '#84272E'

New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "Update Halieus Website-$BrandingRevision.ico") `
    -TopHex '#7FB0EB' -BaseHex '#4F85CF' -BottomHex '#2D60A5' -RimHex '#244F89'

New-HgrLauncherIcon -Path (Join-Path $LauncherRoot "HGR PowerShell-$BrandingRevision.ico") `
    -TopHex '#7FA7BF' -BaseHex '#557990' -BottomHex '#385A70' -RimHex '#2D485B' -PowerShellBadge

Write-Host 'HGR launcher icons generated successfully.'
