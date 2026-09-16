# Halieus Game Room 3.6.8a Validation

Validation gates:
- 3.6.8 baseline regression
- 3.6.8a security / leaderboard / icon regression
- launcher separation regression
- TypeScript/TSX syntax transpilation across source
- release-integrity write + verify
- clean ZIP integrity and re-extraction verification

The build environment may not always have registry access, so the release also pins the dependency floor in package.json overrides and package-lock.json rather than relying on an unrepeatable local npm audit mutation. A registry-backed `npm audit` on the deployment host remains the final live verification of the advisory database at deploy time.
