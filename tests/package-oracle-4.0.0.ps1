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
    foreach ($required in @('.github/workflows/release-identity.yml','.gitignore','SECURITY.md','RELEASE.json','shared/release.ts','client/tsconfig.json','assets/branding/Halieus Game Room.ico','assets/branding/Halieus Game Room.png','assets/branding/references/HGR Main.png','server/data/word-board/SCOWL-COPYRIGHT.txt','server/data/word-board/scowl-en-us.dic','HGR-Control.cmd','Start HGR Control.cmd','Start-HGR-Control.cmd','Start HGR Control Mobile.cmd','Start-HGR-Control-Mobile.cmd','Stop HGR Control Mobile.cmd','Stop-HGR-Control-Mobile.cmd','scripts/windows/start-control-mobile.ps1','scripts/windows/stop-control-mobile.ps1','scripts/windows/control-start.ps1','scripts/windows/control-restart.ps1','scripts/windows/control-close.ps1','scripts/windows/control-update.ps1','scripts/windows/post-update-client.ps1','scripts/windows/refresh-control-after-update.ps1','server/control-ui/index.html','server/control-ui/control.css','server/control-ui/control.js','server/control-ui/manifest.webmanifest','server/control-ui/sw.js','server/control-ui/control-icon.png','server/control-ui/offline.html')) {
        if ($names -notcontains $required) { throw "Deployment archive missing $required" }
    }
    if (@($names | Where-Object { $_ -match '\.(key|pem|ppk|pub)$|(^|/)(node_modules|dist|\.runtime)/' }).Count -gt 0) { throw 'Excluded file leaked into deployment archive.' }
} finally { $check.Dispose() }
$extract = Join-Path ([IO.Path]::GetTempPath()) ('halieus-pack-test-' + [guid]::NewGuid().ToString('N'))
try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $extract)
    $workspaceVersion = (Get-Content -LiteralPath (Join-Path $project 'VERSION') -Raw).Trim()
    $archiveVersion = (Get-Content -LiteralPath (Join-Path $extract 'VERSION') -Raw).Trim()
    if ($archiveVersion -ne $workspaceVersion) {
        throw "Oracle packer selected the wrong HGR root. Workspace is $workspaceVersion but archive is $archiveVersion."
    }
    & node (Join-Path $extract 'scripts/release-integrity.mjs') --verify
    if ($LASTEXITCODE -ne 0) { throw 'Extracted deployment archive failed release integrity.' }
    Write-Host 'PASS: real Oracle archive includes root manifest files and passes release integrity; no network calls.'
Write-Host 'Package-only validation must not require SSH credentials.'
} finally {
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    foreach ($candidate in @($zip, $extract)) {
        $absolute = [IO.Path]::GetFullPath($candidate)
        if (-not $absolute.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Refusing cleanup outside temp directory.' }
        Remove-Item -LiteralPath $absolute -Recurse -Force -ErrorAction SilentlyContinue
    }
}
