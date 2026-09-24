Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

if (-not ('HgrNativeIcon' -as [type])) {
    Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class HgrNativeIcon {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool DestroyIcon(IntPtr handle);
}
"@
}

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$LauncherRoot = Join-Path $ProjectRoot 'assets\branding\launchers'
$PreviewRoot = Join-Path $LauncherRoot 'generated-preview'

# Generated artwork is quarantined from approved launcher assets.
# This script must never delete or overwrite approved files directly under assets\branding\launchers\.
New-Item -ItemType Directory -Force -Path $PreviewRoot | Out-Null

function Get-HgrColour {
    param([Parameter(Mandatory = $true)][string]$Hex)
    return [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function Mix-HgrColour {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Color]$A,
        [Parameter(Mandatory = $true)][System.Drawing.Color]$B,
        [Parameter(Mandatory = $true)][double]$Amount
    )

    $t = [Math]::Max(0.0, [Math]::Min(1.0, $Amount))
    return [System.Drawing.Color]::FromArgb(
        255,
        [int][Math]::Round(($A.R * (1.0 - $t)) + ($B.R * $t)),
        [int][Math]::Round(($A.G * (1.0 - $t)) + ($B.G * $t)),
        [int][Math]::Round(($A.B * (1.0 - $t)) + ($B.B * $t))
    )
}

function New-RoundedRectanglePath {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.RectangleF]$Rect,
        [Parameter(Mandatory = $true)][single]$Radius
    )

    $diameter = $Radius * 2.0
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
        [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap,
        [Parameter(Mandatory = $true)][string]$Path
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

function New-MatteHgrLauncher {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$BaseHex,
        [switch]$PowerShell
    )

    $size = 256
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

        $base = Get-HgrColour $BaseHex
        $white = [System.Drawing.Color]::White
        $black = [System.Drawing.Color]::Black
        $navy = Get-HgrColour '#18233C'

        # Soft depth only. No glass, glow, lens highlight or neon treatment.
        $shadowRect = [System.Drawing.RectangleF]::new(29, 33, 202, 202)
        $shadowPath = New-RoundedRectanglePath -Rect $shadowRect -Radius 45
        $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(50, 0, 0, 0))
        try {
            $graphics.FillPath($shadowBrush, $shadowPath)
        } finally {
            $shadowBrush.Dispose()
            $shadowPath.Dispose()
        }

        $tileRect = [System.Drawing.RectangleF]::new(26, 26, 204, 204)
        $tilePath = New-RoundedRectanglePath -Rect $tileRect -Radius 45
        $top = Mix-HgrColour -A $base -B $white -Amount 0.10
        $bottom = Mix-HgrColour -A $base -B $black -Amount 0.10

        $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $tileRect,
            $top,
            $bottom,
            [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )

        try {
            $graphics.FillPath($gradient, $tilePath)
        } finally {
            $gradient.Dispose()
        }

        $border = Mix-HgrColour -A $base -B $black -Amount 0.28
        $borderPen = [System.Drawing.Pen]::new($border, 4)
        try {
            $graphics.DrawPath($borderPen, $tilePath)
        } finally {
            $borderPen.Dispose()
        }

        # One restrained inner line is enough to give definition at Windows
        # icon sizes without becoming shiny.
        $innerRect = [System.Drawing.RectangleF]::new(32, 32, 192, 192)
        $innerPath = New-RoundedRectanglePath -Rect $innerRect -Radius 40
        $inner = Mix-HgrColour -A $base -B $white -Amount 0.18
        $innerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(105, $inner.R, $inner.G, $inner.B), 2)
        try {
            $graphics.DrawPath($innerPen, $innerPath)
        } finally {
            $innerPen.Dispose()
            $innerPath.Dispose()
        }

        # Consistent H mark across the family.
        $fontFamily = [System.Drawing.FontFamily]::new('Arial')
        $font = [System.Drawing.Font]::new($fontFamily, 118, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $format = [System.Drawing.StringFormat]::new()
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        $hBrush = [System.Drawing.SolidBrush]::new($navy)
        $hShadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(36, 0, 0, 0))

        try {
            $hBox = [System.Drawing.RectangleF]::new(55, 48, 146, 154)
            $hShadowBox = [System.Drawing.RectangleF]::new(57, 51, 146, 154)
            $graphics.DrawString('H', $font, $hShadow, $hShadowBox, $format)
            $graphics.DrawString('H', $font, $hBrush, $hBox, $format)
        } finally {
            $hBrush.Dispose()
            $hShadow.Dispose()
            $format.Dispose()
            $font.Dispose()
            $fontFamily.Dispose()
        }

        if ($PowerShell) {
            $badgeRect = [System.Drawing.RectangleF]::new(158, 163, 72, 54)
            $badgePath = New-RoundedRectanglePath -Rect $badgeRect -Radius 14
            $badgeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(244, 28, 39, 57))
            $badgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(205, 210, 220, 232), 2)
            try {
                $graphics.FillPath($badgeBrush, $badgePath)
                $graphics.DrawPath($badgePen, $badgePath)
            } finally {
                $badgeBrush.Dispose()
                $badgePen.Dispose()
                $badgePath.Dispose()
            }

            $badgeFont = [System.Drawing.Font]::new('Consolas', 25, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
            $badgeText = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 250, 252))
            try {
                $graphics.DrawString('>_', $badgeFont, $badgeText, 166, 173)
            } finally {
                $badgeFont.Dispose()
                $badgeText.Dispose()
            }
        }

        $pngPath = Join-Path $PreviewRoot "$Name.png"
        $icoPath = Join-Path $PreviewRoot "$Name.ico"
        $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Save-BitmapAsIcon -Bitmap $bitmap -Path $icoPath

        $tilePath.Dispose()
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-MatteHgrLauncher -Name 'Start Halieus Game Room' -BaseHex '#258B58'
New-MatteHgrLauncher -Name 'Restart Halieus Game Room' -BaseHex '#B97818'
New-MatteHgrLauncher -Name 'Close Halieus Game Room' -BaseHex '#BD4545'
New-MatteHgrLauncher -Name 'Update Halieus Website' -BaseHex '#3475C5'
New-MatteHgrLauncher -Name 'HGR PowerShell' -BaseHex '#526981' -PowerShell

Write-Host 'HGR placeholder launcher previews generated.' -ForegroundColor Green
Write-Host 'Approved icons directly under assets\branding\launchers were not touched.' -ForegroundColor Green
Write-Host "Preview folder: $PreviewRoot" -ForegroundColor DarkGray
