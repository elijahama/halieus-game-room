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
$SourceIcon = Join-Path $ProjectRoot 'assets\branding\Halieus Game Room.png'
$BrandingRevision = 'r6'

if (-not (Test-Path -LiteralPath $SourceIcon)) {
    throw "Canonical Halieus branding source is missing: $SourceIcon"
}

New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null
Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.ico' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

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

function Add-ActionBadge {
    param(
        [Parameter(Mandatory = $true)][System.Drawing.Bitmap]$Bitmap,
        [Parameter(Mandatory = $true)][ValidateSet('start','restart','close','update','powershell')][string]$Action
    )

    $graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

        $navy = [System.Drawing.ColorTranslator]::FromHtml('#18233C')
        $white = [System.Drawing.Color]::FromArgb(250, 252, 255)
        $accent = switch ($Action) {
            'start'      { [System.Drawing.ColorTranslator]::FromHtml('#258B58') }
            'restart'    { [System.Drawing.ColorTranslator]::FromHtml('#B97818') }
            'close'      { [System.Drawing.ColorTranslator]::FromHtml('#BD4545') }
            'update'     { [System.Drawing.ColorTranslator]::FromHtml('#3475C5') }
            'powershell' { [System.Drawing.ColorTranslator]::FromHtml('#526981') }
        }

        # Preserve the canonical Halieus tile. Action colour lives only in this
        # compact utility badge so every launcher still reads as Halieus first.
        $shadowRect = [System.Drawing.RectangleF]::new(168, 169, 70, 58)
        $shadowPath = New-RoundedRectanglePath -Rect $shadowRect -Radius 14
        $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(82, 0, 0, 0))
        try {
            $graphics.FillPath($shadowBrush, $shadowPath)
        } finally {
            $shadowBrush.Dispose()
            $shadowPath.Dispose()
        }

        $badgeRect = [System.Drawing.RectangleF]::new(163, 164, 70, 58)
        $badgePath = New-RoundedRectanglePath -Rect $badgeRect -Radius 14
        $badgeBrush = [System.Drawing.SolidBrush]::new($accent)
        $badgeOutline = [System.Drawing.Pen]::new($navy, 4)
        try {
            $graphics.FillPath($badgeBrush, $badgePath)
            $graphics.DrawPath($badgeOutline, $badgePath)
        } finally {
            $badgeBrush.Dispose()
            $badgeOutline.Dispose()
        }

        switch ($Action) {
            'start' {
                $points = [System.Drawing.PointF[]]@(
                    [System.Drawing.PointF]::new(188, 179),
                    [System.Drawing.PointF]::new(188, 207),
                    [System.Drawing.PointF]::new(212, 193)
                )
                $brush = [System.Drawing.SolidBrush]::new($white)
                try { $graphics.FillPolygon($brush, $points) } finally { $brush.Dispose() }
            }
            'restart' {
                $font = [System.Drawing.Font]::new('Segoe UI Symbol', 31, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                $brush = [System.Drawing.SolidBrush]::new($white)
                try { $graphics.DrawString('↻', $font, $brush, 177, 176) } finally { $font.Dispose(); $brush.Dispose() }
            }
            'close' {
                $pen = [System.Drawing.Pen]::new($white, 7)
                $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
                try {
                    $graphics.DrawLine($pen, 184, 181, 212, 205)
                    $graphics.DrawLine($pen, 212, 181, 184, 205)
                } finally { $pen.Dispose() }
            }
            'update' {
                $pen = [System.Drawing.Pen]::new($white, 6)
                $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
                $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
                try {
                    $graphics.DrawLine($pen, 198, 177, 198, 202)
                    $graphics.DrawLine($pen, 187, 192, 198, 203)
                    $graphics.DrawLine($pen, 209, 192, 198, 203)
                    $graphics.DrawLine($pen, 184, 209, 212, 209)
                } finally { $pen.Dispose() }
            }
            'powershell' {
                $font = [System.Drawing.Font]::new('Consolas', 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
                $brush = [System.Drawing.SolidBrush]::new($white)
                try { $graphics.DrawString('>_', $font, $brush, 173, 181) } finally { $font.Dispose(); $brush.Dispose() }
            }
        }

        $badgePath.Dispose()
    } finally {
        $graphics.Dispose()
    }
}

function New-HgrLauncherIcon {
    param(
        [Parameter(Mandatory = $true)][string]$OutputPath,
        [Parameter(Mandatory = $true)][ValidateSet('start','restart','close','update','powershell')][string]$Action
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
            Add-ActionBadge -Bitmap $bitmap -Action $Action
            Save-BitmapAsIcon -Bitmap $bitmap -Path $OutputPath
        } finally {
            $bitmap.Dispose()
        }
    } finally {
        $source.Dispose()
    }
}

New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Start Halieus Game Room-$BrandingRevision.ico") -Action start
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Restart Halieus Game Room-$BrandingRevision.ico") -Action restart
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Close Halieus Game Room-$BrandingRevision.ico") -Action close
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "Update Halieus Website-$BrandingRevision.ico") -Action update
New-HgrLauncherIcon -OutputPath (Join-Path $LauncherRoot "HGR PowerShell-$BrandingRevision.ico") -Action powershell

Write-Host 'HGR launcher icons generated from the canonical Halieus mark with action badges.'
