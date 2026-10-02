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
# human-approved reference PNGs. HGR Control keeps one design-authority PNG in
# references and one byte-identical PWA/delivery copy. Windows consumes the
# delivery copy so the existing PWA + launcher contract remains intact.
# The historical references/HGR Control.png remains a model sheet only.
$ControlAuthorityPath = Join-Path $ReferenceRoot 'HGR Control Launcher.png'
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

function Assert-HgrLauncherSource {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$SourcePath
    )

    if (-not (Test-Path -LiteralPath $SourcePath)) {
        throw "Approved HGR launcher source is missing: $SourcePath"
    }

    $probe = [System.Drawing.Image]::FromFile($SourcePath)
    try {
        if ($probe.Width -ne $probe.Height -or $probe.Width -lt 64) {
            throw "Approved HGR launcher source '$Name' must be a square icon image, not a model/reference sheet: $SourcePath ($($probe.Width)x$($probe.Height))"
        }
    } finally {
        $probe.Dispose()
    }
}

function Assert-HgrRuntimeIconExport {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$PngPath,
        [Parameter(Mandatory = $true)][string]$IcoPath
    )

    foreach ($path in @($PngPath, $IcoPath)) {
        if (-not (Test-Path -LiteralPath $path)) {
            throw "HGR launcher export '$Name' is missing after generation: $path"
        }
        if ((Get-Item -LiteralPath $path).Length -le 22) {
            throw "HGR launcher export '$Name' is unexpectedly small or empty: $path"
        }
    }

    $png = [System.Drawing.Image]::FromFile($PngPath)
    try {
        if ($png.Width -ne 256 -or $png.Height -ne 256) {
            throw "HGR launcher PNG '$Name' must export at 256x256: $PngPath ($($png.Width)x$($png.Height))"
        }
    } finally {
        $png.Dispose()
    }

    $icoBytes = [System.IO.File]::ReadAllBytes($IcoPath)
    $reserved = [System.BitConverter]::ToUInt16($icoBytes, 0)
    $kind = [System.BitConverter]::ToUInt16($icoBytes, 2)
    $count = [System.BitConverter]::ToUInt16($icoBytes, 4)
    if ($reserved -ne 0 -or $kind -ne 1 -or $count -lt 1) {
        throw "HGR launcher ICO '$Name' has an invalid icon header: $IcoPath"
    }
}

function Export-HgrReferenceIcon {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$SourcePath
    )

    Assert-HgrLauncherSource -Name $Name -SourcePath $SourcePath

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
        Assert-HgrRuntimeIconExport -Name $Name -PngPath $pngPath -IcoPath $icoPath
    } finally {
        $graphics.Dispose()
        $bitmap.Dispose()
        $source.Dispose()
    }
}

# Protect the split authority/delivery arrangement itself. A future edit cannot
# silently replace the Control PWA copy with another reference/model sheet.
Assert-HgrLauncherSource -Name 'control-authority' -SourcePath $ControlAuthorityPath
Assert-HgrLauncherSource -Name 'control-delivery' -SourcePath $ControlReferencePath
$controlAuthorityHash = (Get-FileHash -LiteralPath $ControlAuthorityPath -Algorithm SHA256).Hash
$controlDeliveryHash = (Get-FileHash -LiteralPath $ControlReferencePath -Algorithm SHA256).Hash
if ($controlAuthorityHash -ne $controlDeliveryHash) {
    throw "HGR Control launcher authority and PWA delivery copy differ. Refresh server/control-ui/control-icon.png from the approved HGR Control Launcher.png before exporting shortcuts."
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

    Assert-HgrLauncherSource -Name 'control-stop' -SourcePath $SourcePath

    $source = [System.Drawing.Image]::FromFile($SourcePath)
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
        Assert-HgrRuntimeIconExport -Name 'control-stop' -PngPath $pngPath -IcoPath $icoPath
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

Write-Host "HGR launcher icons exported from approved square PNG artwork; Stop Control adds only its explicit stop badge: $RuntimeRoot" -ForegroundColor Green
