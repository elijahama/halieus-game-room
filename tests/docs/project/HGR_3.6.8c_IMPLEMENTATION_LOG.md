# HGR 3.6.8c Implementation Log

## Purpose

Repair the Oracle Update failure introduced by 3.6.8b, where three MODERATE npm advisories were incorrectly treated as a release-blocking condition even though the established Halieus release gate is HIGH severity.

## Root cause

`dev-tools/Oracle Quick Deploy/quick-install.sh` ran `npm audit --audit-level=moderate`. npm therefore returned a non-zero exit code for moderate advisories, and `deploy-from-windows.ps1` correctly interpreted the remote installer failure as a failed candidate. The safe deployment design prevented the candidate from replacing the live application.

## Implementation

- Changed the Oracle registry-backed audit gate to `npm audit --audit-level=high`.
- Moderate/low advisories remain printed by npm for owner visibility but no longer create a false deployment failure.
- HIGH/CRITICAL audit findings still stop the candidate before activation.
- `npm ci`, client/server production build, release fingerprint verification, exact `/health` version/fingerprint verification and rollback remain hard deployment gates.
- No `npm audit fix --force` is used.
- Preserved the 3.6.8b Vite/plugin-react/esbuild/PostCSS/nanoid/picomatch dependency security floors unchanged.
- No game engine, protected Ludo/Poker/Mega Board layout, account data or production-data path is changed by this hotfix.
