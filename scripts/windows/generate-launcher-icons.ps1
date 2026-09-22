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
$ReferenceImage = Join-Path $ProjectRoot 'assets\branding\reference\HGR Launcher Family Reference.png'
$LauncherRoot = Join-Path $ProjectRoot 'assets\branding\launchers'
$BrandingRevision = 'r7'

if (-not (Test-Path -LiteralPath $ReferenceImage)) {
    throw "Canonical HGR launcher reference is missing: $ReferenceImage"
}

New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null

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

function New-ReferenceLauncherIcon {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Reference,
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [Parameter(Mandatory = $true)][int]$X,
        [Parameter(Mandatory = $true)][int]$Y,
        [Parameter(Mandatory = $true)][int]$Width,
        [Parameter(Mandatory = $true)][int]$Height,
        [switch]$PowerShell
    )

    $scaleX = $Reference.Width / 1774.0
    $scaleY = $Reference.Height / 887.0

    $sourceRect = [System.Drawing.Rectangle]::new(
        [int][Math]::Round($X * $scaleX),
        [int][Math]::Round($Y * $scaleY),
        [int][Math]::Round($Width * $scaleX),
        [int][Math]::Round($Height * $scaleY)
    )

    $bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        if (-not $PowerShell) {
            $clipRect = [System.Drawing.RectangleF]::new(5, 5, 246, 246)
            $clip = New-RoundedRectanglePath -Rect $clipRect -Radius 50
            try {
                $graphics.SetClip($clip)
                $graphics.DrawImage(
                    $Reference,
                    [System.Drawing.Rectangle]::new(0, 0, 256, 256),
                    $sourceRect,
                    [System.Drawing.GraphicsUnit]::Pixel
                )
            } finally {
                $graphics.ResetClip()
                $clip.Dispose()
            }
        } else {
            $mainClip = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(27, 5, 218, 238)) -Radius 48
            $badgeClip = New-RoundedRectanglePath -Rect ([System.Drawing.RectangleF]::new(158, 160, 92, 72)) -Radius 17
            $combined = [System.Drawing.Drawing2D.GraphicsPath]::new()
            try {
                $combined.AddPath($mainClip, $false)
                $combined.AddPath($badgeClip, $false)
                $graphics.SetClip($combined)
                $graphics.DrawImage(
                    $Reference,
                    [System.Drawing.Rectangle]::new(0, 0, 256, 256),
                    $sourceRect,
                    [System.Drawing.GraphicsUnit]::Pixel
                )
            } finally {
                $graphics.ResetClip()
                $combined.Dispose()
                $mainClip.Dispose()
                $badgeClip.Dispose()
            }
        }
    } finally {
        $graphics.Dispose()
    }

    try {
        Save-BitmapAsIcon -Bitmap $bitmap -Path $OutputPath
    } finally {
        $bitmap.Dispose()
    }
}

$reference = [System.Drawing.Bitmap]::new($ReferenceImage)
try {
    $icons = @(
        @{ Name='Start Halieus Game Room';   X=64;   Y=210; Width=214; Height=214; PowerShell=$false },
        @{ Name='Restart Halieus Game Room'; X=320;  Y=210; Width=215; Height=214; PowerShell=$false },
        @{ Name='Close Halieus Game Room';   X=576;  Y=210; Width=215; Height=214; PowerShell=$false },
        @{ Name='Update Halieus Website';    X=825;  Y=210; Width=215; Height=214; PowerShell=$false },
        @{ Name='HGR PowerShell';             X=1076; Y=210; Width=229; Height=214; PowerShell=$true }
    )

    Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.ico' -File -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue

    foreach ($spec in $icons) {
        $outputPath = Join-Path $LauncherRoot "$($spec.Name)-$BrandingRevision.ico"
        New-ReferenceLauncherIcon -Reference $reference -OutputPath $outputPath -X $spec.X -Y $spec.Y -Width $spec.Width -Height $spec.Height -PowerShell:$spec.PowerShell
    }
} finally {
    $reference.Dispose()
}

Write-Host 'HGR launcher icons extracted directly from the approved branding reference.' -ForegroundColor Green
