# Halieus Game Room 3.6.4 validation record

## Completed source/runtime gates

- Client TypeScript: PASS.
- Server TypeScript: PASS.
- Server production TypeScript build: PASS.
- Dedicated `regression-3.6.4.mjs`: PASS.
- Start/Restart no-auto-deploy regression: PASS.
- Word Arena socket runtime smoke: PASS for Word Game, Password and Anagrams Race.
- Server health reports the 3.6.4 identity and the aggregate Word Arena live-room count.
- Protected Ludo, Poker and Mega Board board/layout source hashes remain unchanged.
- 3.6.3b letter-suffix normalization remains present in Windows deploy, Oracle install, local startup and automatic updater paths.
- Patched Vite / Socket.IO parser / Engine.IO / Express / qs / ws dependency floors remain locked; compromised `debug` 4.4.2 is absent.

## Word Arena runtime smoke coverage

The runtime test launches an isolated 3.6.4 server against temporary data and uses real Socket.IO clients:

- **Word Game:** creates a room, starts a puzzle, confirms the secret remains private, submits a five-letter guess and receives five-position Wordle feedback.
- **Password:** creates and joins a two-player room, verifies only the rotating clue giver receives the password, submits a legal one-word clue, then confirms a correct guess awards the round.
- **Anagrams Race:** creates and joins a two-player room, receives a public scramble without leaking the answer, resolves the scramble and confirms the first correct solve wins the round.

## Client production bundle environment note

The preserved dependency tree supplied with the project is Windows-native. The normal Linux `vite build` launcher is not executable in this extracted tree, and invoking Vite directly reaches Rollup but cannot load the optional `@rollup/rollup-linux-x64-gnu` native package. Client TypeScript is clean; the authoritative client production-bundle gate remains a clean Oracle/Windows `npm ci` followed by the normal build. No dependency was force-repaired or replaced simply to make this Linux validation environment bundle.

## Package gate

Before delivery the clean source ZIP must be staged without `node_modules`, `dist`, runtime/player data, logs, private keys or owner bootstrap codes, then re-extracted and checked with release-integrity plus 3.6.4 regressions.
