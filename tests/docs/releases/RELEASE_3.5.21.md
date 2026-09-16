# Halieus Game Room 3.5.21

## Oracle updater compatibility

- Fixes the Windows PowerShell 5.1 deployment failure `Unable to find type [System.IO.Compression.ZipArchiveMode]`.
- The Oracle Quick Deploy packer now explicitly loads both `System.IO.Compression` and `System.IO.Compression.FileSystem` before creating the source archive.
- SSH key discovery from 3.5.19/3.5.20 is unchanged; a key that already authenticated is reused by path only.
- Carries forward the 3.5.20 Mega Board live-deal false-positive fix.
