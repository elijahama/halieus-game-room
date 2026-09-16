# Halieus Game Room 3.6.8b Validation

Validation targets for this hotfix:

- 3.6.8 and 3.6.8a regressions remain green.
- Dedicated 3.6.8b dependency-security regression passes.
- Release package and lockfile identify Vite 7.3.6, @vitejs/plugin-react 5.2.0 and esbuild 0.28.1.
- Vite has no nested/private esbuild copy in the release lockfile.
- Oracle/Windows `npm ci` remains the authoritative registry-backed npm-audit and production-build gate.
