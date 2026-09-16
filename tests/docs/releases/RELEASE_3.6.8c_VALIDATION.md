# Halieus Game Room 3.6.8c Validation

Validation targets for this deployment hotfix:

- 3.6.8, 3.6.8a and 3.6.8b regressions remain green after the public version bump.
- Dedicated 3.6.8c regression confirms the Oracle audit threshold is HIGH, not MODERATE.
- The dependency security floors from 3.6.8b remain unchanged.
- `quick-install.sh` passes shell syntax validation.
- Release fingerprint generation and verification pass against the staged source.
- A real registry-backed `npm audit` and production `npm ci`/build remain Oracle/Windows deployment-host validation because the patch environment has no registry access.
- Live Oracle acceptance is complete only after Update reaches build/activation and `/health` reports the exact 3.6.8c version and fingerprint.
