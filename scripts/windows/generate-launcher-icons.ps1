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
$RuntimeRoot = Join-Path $ProjectRoot 'server\data\runtime\launcher-icons'
New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

function Get-HgrColour {
    param([Parameter(Mandatory = $true)][string]$Hex)
    [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function Mix-HgrColour {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Color]$A,
        [Parameter(Mandatory = $true)][System.Drawing.Color]$B,
        [Parameter(Mandatory = $true)][double]$Amount
    )
    $t = [Math]::Max(0.0, [Math]::Min(1.0, $Amount))
    [System.Drawing.Color]::FromArgb(
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
    $path
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
        try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose() }
    } finally {
        [void][HgrNativeIcon]::DestroyIcon($handle)
    }
}

function Draw-HalieusH {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
        [Parameter(Mandatory = $true)][System.Drawing.Brush]$Brush
    )

    # Exact 4x rendering of the approved HGR ICON - CONTROL UPDATE H:
    # reference-matched 32x34 block H with 9-unit stems and an 8-unit centred bridge.
    $Graphics.FillRectangle($Brush, 64, 60, 36, 136)
    $Graphics.FillRectangle($Brush, 156, 60, 36, 136)
    $Graphics.FillRectangle($Brush, 100, 112, 56, 32)
}

function Draw-HgrBadge {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Graphics]$Graphics,
        [Parameter(Mandatory = $true)][string]$Role
    )
    $white = [System.Drawing.Color]::White
    $pen = [System.Drawing.Pen]::new($white, 10)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    try {
        switch ($Role) {
            'start' {
                $points = [System.Drawing.PointF[]]@(
                    [System.Drawing.PointF]::new(176, 172),
                    [System.Drawing.PointF]::new(176, 220),
                    [System.Drawing.PointF]::new(216, 196)
                )
                $Graphics.DrawPolygon($pen, $points)
            }
            'close' {
                $Graphics.DrawLine($pen, 176, 176, 216, 216)
                $Graphics.DrawLine($pen, 216, 176, 176, 216)
            }
            'update' {
                $Graphics.DrawLine($pen, 196, 220, 196, 172)
                $Graphics.DrawLine($pen, 176, 192, 196, 172)
                $Graphics.DrawLine($pen, 216, 192, 196, 172)
            }
            'restart' {
                $Graphics.DrawArc($pen, 168, 168, 56, 56, 35, 285)
                $Graphics.DrawLine($pen, 216, 172, 216, 192)
                $Graphics.DrawLine($pen, 216, 192, 196, 192)
            }
            'powershell' {
                $Graphics.DrawLine($pen, 172, 180, 188, 196)
                $Graphics.DrawLine($pen, 188, 196, 172, 212)
                $Graphics.DrawLine($pen, 196, 212, 216, 212)
            }
            'openshard' {
                $points = [System.Drawing.PointF[]]@(
                    [System.Drawing.PointF]::new(196, 172),
                    [System.Drawing.PointF]::new(220, 196),
                    [System.Drawing.PointF]::new(196, 220),
                    [System.Drawing.PointF]::new(172, 196)
                )
                $Graphics.DrawPolygon($pen, $points)
            }
            'control' {
                $Graphics.DrawEllipse($pen, 180, 180, 32, 32)
                foreach ($line in @(
                    @(196, 168, 196, 176), @(196, 216, 196, 224),
                    @(168, 196, 176, 196), @(216, 196, 224, 196),
                    @(177, 177, 183, 183), @(209, 209, 215, 215),
                    @(215, 177, 209, 183), @(183, 209, 177, 215)
                )) {
                    $Graphics.DrawLine($pen, $line[0], $line[1], $line[2], $line[3])
                }
            }
        }
    } finally {
        $pen.Dispose()
    }
}

function New-HgrLauncherIcon {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$BaseHex,
        [Parameter(Mandatory = $true)][string]$Role
    )

    $size = 256
    $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $base = Get-HgrColour $BaseHex
        $white = [System.Drawing.Color]::White
        $black = [System.Drawing.Color]::Black

        $shadowRect = [System.Drawing.RectangleF]::new(26, 30, 204, 204)
        $shadowPath = New-RoundedRectanglePath -Rect $shadowRect -Radius 45
        $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(48, 0, 0, 0))
        try { $graphics.FillPath($shadowBrush, $shadowPath) } finally { $shadowBrush.Dispose(); $shadowPath.Dispose() }

        $tileRect = [System.Drawing.RectangleF]::new(26, 26, 204, 204)
        $tilePath = New-RoundedRectanglePath -Rect $tileRect -Radius 45
        $top = Mix-HgrColour -A $base -B $white -Amount 0.18
        $bottom = Mix-HgrColour -A $base -B $black -Amount 0.08
        $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $tileRect, $top, $bottom, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
        )
        try { $graphics.FillPath($gradient, $tilePath) } finally { $gradient.Dispose() }

        $innerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(45, 255, 255, 255), 2)
        try {
            $innerRect = [System.Drawing.RectangleF]::new(31, 31, 194, 194)
            $innerPath = New-RoundedRectanglePath -Rect $innerRect -Radius 41
            $graphics.DrawPath($innerPen, $innerPath)
            $innerPath.Dispose()
        } finally { $innerPen.Dispose() }

        $hBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(7, 9, 13))
        try { Draw-HalieusH -Graphics $graphics -Brush $hBrush } finally { $hBrush.Dispose() }
        Draw-HgrBadge -Graphics $graphics -Role $Role

        $pngPath = Join-Path $RuntimeRoot "$Name.png"
        $icoPath = Join-Path $RuntimeRoot "$Name.ico"
        $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Save-BitmapAsIcon -Bitmap $bitmap -Path $icoPath
        $tilePath.Dispose()
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

$roles = [ordered]@{
    main = '#F4C430'
    start = '#22C55E'
    restart = '#F59E0B'
    close = '#EF4444'
    update = '#38BDF8'
    powershell = '#64748B'
    openshard = '#A855F7'
    control = '#4F7BFE'
}

foreach ($entry in $roles.GetEnumerator()) {
    New-HgrLauncherIcon -Name $entry.Key -BaseHex $entry.Value -Role $entry.Key
}

Write-Host "HGR runtime launcher icons generated: $RuntimeRoot" -ForegroundColor Green
