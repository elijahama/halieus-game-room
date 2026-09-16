# Halieus Game Room 3.5.27 — Legacy SSH Credential Packaging Hotfix

## Problem

3.5.26 correctly refused to upload private SSH credentials, but it did so by aborting the entire deployment whenever an old `.key` file was found anywhere inside the owner's Halieus workspace. Older Quick Deploy folders can legitimately still contain the original Oracle key pair, so this safety gate prevented a valid application update.

## Fix

- Routine Update now **skips** local SSH credential files instead of aborting.
- Excluded credential extensions: `.key`, `.pem`, `.ppk`, `.pub`.
- Excluded credential files are never added to the Oracle source archive.
- Release-integrity hashing ignores those credential files as non-release inputs.
- `scripts/release-integrity.mjs` itself is now included in the release fingerprint inputs.
- Start and Restart remain deployment-free.
- No game, layout, server-gameplay, or account-data changes are part of this hotfix.

## Expected update behavior

If a legacy key exists under `dev-tools/Oracle Quick Deploy`, Update prints a warning such as:

`Skipping local SSH credential file: dev-tools/Oracle Quick Deploy/ssh-key-....key`

and continues packaging and deployment.
