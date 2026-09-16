# 3.5.27 validation record

Exact release fingerprint: `hgr-3.5.27-9432b42d59806243`

Validated locally:

- Release-integrity verification passes.
- Current 3.5.27 regression passes.
- Start/Restart launcher separation regression passes.
- 3.5.14 turn-timer regression passes.
- 3.5.20 false live-deal regression passes.
- 3.5.23 public-health verification regression passes.
- A simulated legacy Quick Deploy folder containing both `.key` and `.key.pub` files does not alter the release fingerprint.
- A simulated Oracle deployment-source archive excludes both credential files and recomputes the exact 3.5.27 fingerprint successfully after extraction.

- A simulated stale source file under `client/src` is excluded from the deployment source using the exact `integrityFiles` inventory.
