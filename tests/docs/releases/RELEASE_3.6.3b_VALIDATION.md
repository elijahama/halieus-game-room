# Halieus Game Room 3.6.3b validation record

Date: 31 August 2026

## Passed

- public VERSION `3.6.3b` and npm workspace metadata `3.6.3-b` are consistent;
- base 3.6.3 stabilization regression PASS;
- dedicated 3.6.3b Owner tab-hub regression PASS;
- launcher/deployment separation regression PASS;
- client TypeScript PASS;
- server TypeScript PASS;
- server production build PASS;
- release-integrity generation and verification PASS;
- CSS structural brace sanity PASS;
- 3.6.3b CSS does not target Ludo or Poker and does not change Mega Board board/game geometry;
- no CSS zoom/global scale workaround introduced;
- 3.6.3 protected-source hashes continue to pass.

## Environment-only client bundle gate

The extracted dependency tree is the preserved Windows-native 3.6.3 dependency set. Linux Vite bundling cannot load Rollup's optional `@rollup/rollup-linux-x64-gnu` binary. This is the same packaging-environment limitation as the base 3.6.3 build, not a 3.6.3b TypeScript/source failure. Oracle/Windows clean `npm ci` remains the authoritative client production-bundle gate.

## Packaging gate

The final distributable must exclude `node_modules`, generated `dist`, runtime/player data, logs and credential-like key material, then pass ZIP integrity and release-manifest verification from the staged tree.

Visual acceptance after deployment remains the Owner's final check on the actual desktop/tablet/mobile browser surfaces.

## 3.6.3b version contract correction

Halieus display/runtime version remains `3.6.3b`. npm workspace metadata uses the SemVer-compatible `3.6.3-b`. Windows launcher/deployment checks and the Oracle installer normalize these forms before package comparison, while `RELEASE.json`, health responses, build markers and release fingerprints continue to use the Halieus-facing `3.6.3b` identity. Automatic website version ordering also understands letter patches (`3.6.3` < `3.6.3a` < `3.6.3b` < `3.6.4`).
