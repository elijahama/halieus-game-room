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
$ReferenceRoot = Join-Path $ProjectRoot 'assets\branding\reference'
$LauncherRoot = Join-Path $ProjectRoot 'assets\branding\launchers'
$BrandingRevision = 'r7'

New-Item -ItemType Directory -Force -Path $LauncherRoot | Out-Null

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

function Convert-ApprovedLauncherAsset {
    param(
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$OutputPath
    )

    $extension = [System.IO.Path]::GetExtension($SourcePath).ToLowerInvariant()

    if ($extension -eq '.ico') {
        Copy-Item -LiteralPath $SourcePath -Destination $OutputPath -Force
        return
    }

    if ($extension -notin @('.png', '.jpg', '.jpeg', '.bmp')) {
        throw "Unsupported approved launcher asset format: $SourcePath"
    }

    $source = [System.Drawing.Bitmap]::new($SourcePath)
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
            Save-BitmapAsIcon -Bitmap $bitmap -Path $OutputPath
        } finally {
            $bitmap.Dispose()
        }
    } finally {
        $source.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $ReferenceRoot)) {
    throw "HGR branding reference folder is missing: $ReferenceRoot"
}

# Approved launcher artwork belongs in assets/branding/reference/launchers.
# The generator intentionally DOES NOT draw, recolour or reinterpret the HGR
# brand. It only converts approved artwork to Windows ICO files.
$ApprovedLauncherRoot = Join-Path $ReferenceRoot 'launchers'

$approvedAssets = [ordered]@{
    'Start Halieus Game Room'   = @('Start Halieus Game Room.ico', 'Start Halieus Game Room.png')
    'Restart Halieus Game Room' = @('Restart Halieus Game Room.ico', 'Restart Halieus Game Room.png')
    'Close Halieus Game Room'   = @('Close Halieus Game Room.ico', 'Close Halieus Game Room.png')
    'Update Halieus Website'    = @('Update Halieus Website.ico', 'Update Halieus Website.png')
    'HGR PowerShell'            = @('HGR PowerShell.ico', 'HGR PowerShell.png')
}

$resolvedAssets = [ordered]@{}
$missing = @()

foreach ($label in $approvedAssets.Keys) {
    $resolved = $null
    foreach ($candidate in $approvedAssets[$label]) {
        $candidatePath = Join-Path $ApprovedLauncherRoot $candidate
        if (Test-Path -LiteralPath $candidatePath) {
            $resolved = $candidatePath
            break
        }
    }

    if ($null -eq $resolved) {
        $missing += $label
    } else {
        $resolvedAssets[$label] = $resolved
    }
}

if ($missing.Count -gt 0) {
    $referenceImages = @(
        Get-ChildItem -LiteralPath $ReferenceRoot -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension.ToLowerInvariant() -in @('.png', '.jpg', '.jpeg', '.webp', '.bmp') } |
            Select-Object -ExpandProperty FullName
    )

    Write-Host ''
    Write-Host 'HGR launcher generation stopped intentionally.' -ForegroundColor Yellow
    Write-Host 'Approved launcher artwork has not been exported from the branding reference yet.' -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Reference artwork currently visible to this computer:' -ForegroundColor Cyan
    if ($referenceImages.Count -gt 0) {
        foreach ($image in $referenceImages) { Write-Host "  $image" -ForegroundColor DarkGray }
    } else {
        Write-Host '  (no reference image found)' -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host 'Missing approved launcher exports:' -ForegroundColor Cyan
    foreach ($label in $missing) { Write-Host "  $label" -ForegroundColor DarkGray }
    Write-Host ''
    Write-Host "Expected folder: $ApprovedLauncherRoot" -ForegroundColor DarkGray
    Write-Host 'The script will not invent or procedurally recolour HGR artwork anymore.' -ForegroundColor Green

    throw "Approved HGR launcher artwork is incomplete. Export the reference artwork first."
}

Get-ChildItem -LiteralPath $LauncherRoot -Filter '*.ico' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

foreach ($label in $resolvedAssets.Keys) {
    $outputPath = Join-Path $LauncherRoot "$label-$BrandingRevision.ico"
    Convert-ApprovedLauncherAsset -SourcePath $resolvedAssets[$label] -OutputPath $outputPath
}

Write-Host 'HGR launcher icons created from approved reference artwork only.' -ForegroundColor Green
