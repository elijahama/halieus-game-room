Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

# Keep the native helper deliberately tiny. All drawing/recolouring happens
# through the already-loaded System.Drawing assembly in PowerShell so Windows
# PowerShell does not need to compile C# against Drawing2D/Imaging namespaces.
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
$SourceIcon = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.png'
$BrandingRevision = 'r5'

if (-not (Test-Path -LiteralPath $SourceIcon)) {
    throw "Canonical Halieus branding source is missing: $SourceIcon"
}

New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null
Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.ico' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

function Convert-HsvToColor {
    param(
        [Parameter(Mandatory = $true)][double]$Hue,
        [Parameter(Mandatory = $true)][double]$Saturation,
        [Parameter(Mandatory = $true)][double]$Value,
        [Parameter(Mandatory = $true)][int]$Alpha
    )

    $h = (($Hue % 360.0) + 360.0) % 360.0
    $s = [Math]::Max(0.0, [Math]::Min(1.0, $Saturation))
    $v = [Math]::Max(0.0, [Math]::Min(1.0, $Value))

    $c = $v * $s
    $x = $c * (1.0 - [Math]::Abs((($h / 60.0) % 2.0) - 1.0))
    $m = $v - $c

    [double]$r1 = 0.0
    [double]$g1 = 0.0
    [double]$b1 = 0.0

    if ($h -lt 60.0) {
        $r1 = $c; $g1 = $x
    } elseif ($h -lt 120.0) {
        $r1 = $x; $g1 = $c
    } elseif ($h -lt 180.0) {
        $g1 = $c; $b1 = $x
    } elseif ($h -lt 240.0) {
        $g1 = $x; $b1 = $c
    } elseif ($h -lt 300.0) {
        $r1 = $x; $b1 = $c
    } else {
        $r1 = $c; $b1 = $x
    }

    return [System.Drawing.Color]::FromArgb(
        $Alpha,
        [int][Math]::Round(($r1 + $m) * 255.0),
        [int][Math]::Round(($g1 + $m) * 255.0),
        [int][Math]::Round(($b1 + $m) * 255.0)
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

function Add-TerminalBadge {
    param([Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap)

    $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

        $badgeRect = [System.Drawing.RectangleF]::new(165, 171, 72, 52)
        $badgePath = New-RoundedRectanglePath -Rect $badgeRect -Radius 12
        $fill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(242, 23, 32, 51))
        $outline = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 238, 244, 250), 2)

        try {
            $graphics.FillPath($fill, $badgePath)
            $graphics.DrawPath($outline, $badgePath)
        } finally {
            $fill.Dispose()
            $outline.Dispose()
            $badgePath.Dispose()
        }

        $font = [System.Drawing.Font]::new('Consolas', 25, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 250, 252))
        try {
            $graphics.DrawString('>_', $font, $brush, 171, 181)
        } finally {
            $font.Dispose()
            $brush.Dispose()
        }
    } finally {
        $graphics.Dispose()
    }
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

function New-HgrLauncherIcon {
    param(
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [Parameter(Mandatory = $true)][double]$TargetHue,
        [Parameter(Mandatory = $true)][double]$SaturationScale,
        [Parameter(Mandatory = $true)][double]$ValueScale,
        [switch]$PowerShellBadge
    )

    $source = [System.Drawing.Bitmap]::new($SourceIcon)
    try {
        $bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 256, 256))
        } finally {
            $graphics.Dispose()
        }

        try {
            # The tracked Halieus app icon is the approved shape, H geometry,
            # rim, gloss and depth. Only warm/gold body pixels are recoloured;
            # navy identity pixels and highlights remain intact.
            for ($y = 0; $y -lt $bitmap.Height; $y++) {
                for ($x = 0; $x -lt $bitmap.Width; $x++) {
                    $pixel = $bitmap.GetPixel($x, $y)
                    if ($pixel.A -eq 0) { continue }

                    $hue = [double]$pixel.GetHue()
                    $saturation = [double]$pixel.GetSaturation()
                    $value = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B)) / 255.0

                    if ($hue -ge 18.0 -and $hue -le 60.0 -and $saturation -ge 0.15 -and $value -ge 0.10) {
                        $recoloured = Convert-HsvToColor -Hue $TargetHue -Saturation ($saturation * $SaturationScale) -Value ($value * $ValueScale) -Alpha $pixel.A
                        $bitmap.SetPixel($x, $y, $recoloured)
                    }
                }
            }

            if ($PowerShellBadge) {
                Add-TerminalBadge -Bitmap $bitmap
            }

            Save-BitmapAsIcon -Bitmap $bitmap -Path $OutputPath
        } finally {
            $bitmap.Dispose()
        }
    } finally {
        $source.Dispose()
    }
}

New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Start Halieus Game Room-$BrandingRevision.ico") -TargetHue 145.0 -SaturationScale 0.95 -ValueScale 0.98
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Restart Halieus Game Room-$BrandingRevision.ico") -TargetHue 36.0 -SaturationScale 0.90 -ValueScale 0.97
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Close Halieus Game Room-$BrandingRevision.ico") -TargetHue 356.0 -SaturationScale 0.90 -ValueScale 0.95
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Update Halieus Website-$BrandingRevision.ico") -TargetHue 213.0 -SaturationScale 0.95 -ValueScale 0.98
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "HGR PowerShell-$BrandingRevision.ico") -TargetHue 205.0 -SaturationScale 0.58 -ValueScale 0.84 -PowerShellBadge

Write-Host 'HGR launcher icons generated from the canonical Halieus mark.'
