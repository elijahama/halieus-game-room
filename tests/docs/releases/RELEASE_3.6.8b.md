# Halieus Game Room 3.6.8b

3.6.8b is an urgent npm dependency-security hotfix on top of 3.6.8a.

## Security changes

- Moves the client build toolchain to Vite 7.3.6 and @vitejs/plugin-react 5.2.0.
- Pins esbuild 0.28.1 across the workspace and removes Vite's older private esbuild copy from the release lockfile.
- Retains the patched PostCSS 8.5.26, nanoid 3.3.18 and picomatch 4.0.7 floors introduced in 3.6.8a.
- Raises the Node runtime floor to 20.19.0, matching the supported Vite 7 toolchain.
- Oracle deployment now runs `npm audit --audit-level=moderate` after `npm ci`; any remaining moderate/high/critical advisory stops the candidate before it can replace the live site.

The ranked leaderboard layering/access and uniform game-icon work from 3.6.8a remains included.
