# Resize only the approved Control raster; never redraw the H or cog.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$source = Join-Path $project 'assets\branding\references\HGR Control Launcher.png'
$approval = Get-Content (Join-Path $project 'assets\branding\references\control-artwork.json') -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant() -ne $approval.sha256) { throw 'Control artwork is not approved.' }
$target = Join-Path $project 'client\public\control\control-icon-512.png'
$original = [System.Drawing.Image]::FromFile($source)
$bitmap = [System.Drawing.Bitmap]::new(512,512,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($original,[System.Drawing.Rectangle]::new(0,0,512,512))
  $bitmap.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $bitmap.Dispose(); $original.Dispose() }
