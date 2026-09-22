# Runs the real Oracle packer locally. SSH/SCP must never be called.
$ErrorActionPreference = 'Stop'
function ssh { throw 'Packaging regression attempted SSH.' }
function scp { throw 'Packaging regression attempted SCP.' }
$project = Split-Path $PSScriptRoot -Parent
$zip = & (Join-Path $project 'tests/dev-tools/Oracle Quick Deploy/deploy-from-windows.ps1') -PackageOnly
$zip = [string](@($zip)[-1])
Add-Type -AssemblyName System.IO.Compression.FileSystem
$check = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
    $names = @($check.Entries | ForEach-Object { $_.FullName })
    foreach ($required in @('.gitignore','SECURITY.md','RELEASE.json','shared/release.ts','client/tsconfig.json','server/data/word-board/scowl-en-us.dic')) {
        if ($names -notcontains $required) { throw "Deployment archive missing $required" }
    }
    if (@($names | Where-Object { $_ -match '\.(key|pem|ppk|pub)$|(^|/)(node_modules|dist|\.runtime)/' }).Count -gt 0) { throw 'Excluded file leaked into deployment archive.' }
} finally { $check.Dispose() }
$extract = Join-Path ([IO.Path]::GetTempPath()) ('halieus-pack-test-' + [guid]::NewGuid().ToString('N'))
try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extract)
    & node (Join-Path $extract 'scripts/release-integrity.mjs') --verify
    if ($LASTEXITCODE -ne 0) { throw 'Extracted deployment archive failed release integrity.' }
    Write-Host 'PASS: real Oracle archive includes root manifest files and passes release integrity; no network calls.'
} finally {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    foreach ($candidate in @($zip, $extract)) {
        $absolute = [IO.Path]::GetFullPath($candidate)
        if (-not $absolute.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing cleanup outside temp directory.' }
        Remove-Item -LiteralPath $absolute -Recurse -Force -ErrorAction SilentlyContinue
    }
}
