# 3.5.26 validation record

Exact release fingerprint: `hgr-3.5.26-13c54d29a8a4cb9f`  
SHA-256 source hash: `13c54d29a8a4cb9f6508b05bf45c2237bb40f34f06769938c2e66c5a7c3fe665`  
Integrity inputs: 223 files

## Passed before packaging

- 3.5.12 Mega Board viewport regression
- 3.5.14 turn/trade timer regression
- 3.5.20 false live-deal regression
- 3.5.23 Windows public-health helper regression
- 3.5.26 Start/Restart deployment-separation regression
- 3.5.26 release-integrity/protected-file regression
- Bash syntax checks for routine Oracle update and separate provisioning script
- TypeScript/TSX syntax parse across client, server and shared sources
- Simulated Oracle deployment-source package successfully recomputed and verified this exact fingerprint
- Private `.key`, `.pem`, and `.ppk` files are rejected from release packaging

## Build gate

The local packaging environment could not complete `npm ci` because registry downloads were unavailable. This is not hidden: routine Oracle Update still runs `npm ci` and `npm run build` against a candidate directory **before** it touches the live application. If that candidate build fails, the existing live application is not replaced.

A deployment is considered successful only when Oracle `/health` reports both version `3.5.26` and exact fingerprint `hgr-3.5.26-13c54d29a8a4cb9f`.
