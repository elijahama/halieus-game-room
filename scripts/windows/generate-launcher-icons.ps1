Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ReferenceRoot = Join-Path $ProjectRoot 'assets\branding\references'
$RuntimeRoot = Join-Path $ProjectRoot 'server\data\runtime\launcher-icons'
New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

# Launcher refresh owns this runtime directory. Remove stale exports first so
# Windows cannot keep showing an icon file left behind by an older mapping.
Get-ChildItem -LiteralPath $RuntimeRoot -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in '.png', '.ico' } |
    Remove-Item -Force -ErrorAction SilentlyContinue

# Approved launcher PNGs are pixel-authoritative. Standard launchers source the
# human-approved reference PNGs. HGR Control deliberately uses the dedicated
# approved Control PWA PNG because the old references/HGR Control.png file was
# accidentally a full model sheet rather than a square launcher icon.
$ControlReferencePath = Join-Path $ProjectRoot 'server\control-ui\control-icon.png'
$SourceMap = [ordered]@{
    main       = Join-Path $ReferenceRoot 'HGR Main.png'
    start      = Join-Path $ReferenceRoot 'HGR Start.png'
    restart    = Join-Path $ReferenceRoot 'HGR Restart.png'
    close      = Join-Path $ReferenceRoot 'HGR Close.png'
    update     = Join-Path $ReferenceRoot 'HGR Update.png'
    powershell = Join-Path $ReferenceRoot 'HGR PowerShell.png'
    openshard  = Join-Path $ReferenceRoot 'HGR OpenShard.png'
    control    = $ControlReferencePath
}

function Write-PngIconContainer {
    param(
        [Parameter(Mandatory = $true)][byte[]]$PngBytes,
        [Parameter(Mandatory = $true)][string]$Path
    )
    $stream = [System.IO.MemoryStream]::new()
    $writer = [System.IO.BinaryWriter]::new($stream)
    try {
        $writer.Write([uint16]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]1)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([byte]0)
        $writer.Write([uint16]1)
        $writer.Write([uint16]32)
        $writer.Write([uint32]$PngBytes.Length)
        $writer.Write([uint32]22)
        $writer.Write($PngBytes)
        $writer.Flush()
        [System.IO.File]::WriteAllBytes($Path, $stream.ToArray())
    } finally {
        $writer.Dispose()
        $stream.Dispose()
    }
}

function Export-HgrReferenceIcon {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$SourcePath
    )
    if (-not (Test-Path -LiteralPath $SourcePath)) {
        throw "Approved HGR launcher source is missing: $SourcePath"
    }

    $source = [System.Drawing.Image]::FromFile($SourcePath)
    $bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, 256, 256)

        $pngPath = Join-Path $RuntimeRoot "$Name.png"
        $icoPath = Join-Path $RuntimeRoot "$Name.ico"
        $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-PngIconContainer -PngBytes ([System.IO.File]::ReadAllBytes($pngPath)) -Path $icoPath
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $source.Dispose()
    }
}

foreach ($entry in $SourceMap.GetEnumerator()) {
    Export-HgrReferenceIcon -Name $entry.Key -SourcePath $entry.Value
}

# Stop Control is a delivery derivative of the approved Control PNG. The H,
# tile, colour, sheen and rim are copied from that PNG unchanged; only the
# explicit red stop badge is added so Start Control and Stop Control cannot be
# confused on the Windows desktop.
function Export-HgrStopControlIcon {
    param([Parameter(Mandatory = $true)][string]$SourcePath)

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        throw "Approved HGR Control PNG is missing: $SourcePath"
    }

    $source = [System.Drawing.Image]::FromFile($SourcePath)
    if ($source.Width -ne $source.Height -or $source.Width -lt 64) {
        $source.Dispose()
        throw "Approved HGR Control PNG must be a square launcher image: $SourcePath"
    }

    $bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $badgeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 183, 47, 55))
    $badgeBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 126, 132), 5)
    $xPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 8)
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.DrawImage($source, 0, 0, 256, 256)

        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
        $badgeRect = [System.Drawing.RectangleF]::new(174, 174, 68, 68)
        $graphics.FillEllipse($badgeBrush, $badgeRect)
        $graphics.DrawEllipse($badgeBorder, $badgeRect)
        $graphics.DrawLine($xPen, 194, 194, 222, 222)
        $graphics.DrawLine($xPen, 222, 194, 194, 222)

        $pngPath = Join-Path $RuntimeRoot 'control-stop.png'
        $icoPath = Join-Path $RuntimeRoot 'control-stop.ico'
        $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-PngIconContainer -PngBytes ([System.IO.File]::ReadAllBytes($pngPath)) -Path $icoPath
    } finally {
        $xPen.Dispose()
        $badgeBorder.Dispose()
        $badgeBrush.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
        $source.Dispose()
    }
}

Export-HgrStopControlIcon -SourcePath $ControlReferencePath

Write-Host "HGR launcher icons exported from approved PNG artwork; Stop Control adds only its explicit stop badge: $RuntimeRoot" -ForegroundColor Green
