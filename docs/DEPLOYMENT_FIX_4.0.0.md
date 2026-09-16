# 4.0.0 Oracle packaging correction — 16 September 2026

The earlier corrected/audited ZIP (fingerprint hgr-4.0.0-d8d667c4197f7e9c) failed locally before upload: `.gitignore` and `SECURITY.md` were required by RELEASE.json but absent from the Oracle packer's root-file allowlist. The downloadable ZIP itself contained them and passed integrity; that check did not exercise the separate deployment archive. No upload or activation occurred in the reported attempt.

The packer now adds every root-level manifest input to its root-file list, including dotfiles. It retains the existing completeness check, static-data handling and credential exclusions. A new `-PackageOnly` switch runs the exact packing path without requiring credentials, SSH tools or network operations, then returns the local archive path.

`tests/package-oracle-4.0.0.ps1` exercises the actual Windows packer, checks the formerly missing files and exclusions, extracts the archive and runs release-integrity verification. It substitutes failing SSH/SCP functions to catch accidental network use. Run with Windows PowerShell 5.1 or PowerShell 7:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/package-oracle-4.0.0.ps1
```

Version remains 4.0.0. Prior intro, reconnect and security corrections remain intact. Use the replacement ZIP labelled **Deployment Fix**; the previous Corrected and Audited ZIP is superseded. Extract the complete replacement project, then use Update Halieus Website as usual. Existing private SSH keys and persistent runtime data must remain private and outside the distributed package. This task validates packaging locally; it does not deploy to Oracle.

Project-wide handoff: this note is included in the release and mirrored in the local ChatGPT project root as PROJECT_STATUS.md. Local file creation does not confirm that a cloud project has synchronized it.
