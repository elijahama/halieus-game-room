Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ReferenceRoot = Join-Path $ProjectRoot 'assets\branding\references'
$RuntimeRoot = Join-Path $ProjectRoot 'server\data\runtime\launcher-icons'
New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

# Approved launcher PNGs are pixel-authoritative. This script may resize them
# for Windows delivery and wrap them as ICO, but it must never redraw the H,
# badge, colour, sheen, rim, shadow or any other part of the artwork.
$SourceMap = [ordered]@{
    main       = 'HGR Main.png'
    start      = 'HGR Start.png'
    restart    = 'HGR Restart.png'
    close      = 'HGR Close.png'
    update     = 'HGR Update.png'
    powershell = 'HGR PowerShell.png'
    openshard  = 'HGR OpenShard.png'
    control    = 'HGR Control.png'
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
        [Parameter(Mandatory = $true)][string]$ReferenceFile
    )
    $sourcePath = Join-Path $ReferenceRoot $ReferenceFile
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Approved HGR launcher reference is missing: $sourcePath"
    }

    $source = [System.Drawing.Image]::FromFile($sourcePath)
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
    Export-HgrReferenceIcon -Name $entry.Key -ReferenceFile $entry.Value
}

Write-Host "HGR launcher icons exported directly from approved reference PNGs: $RuntimeRoot" -ForegroundColor Green
