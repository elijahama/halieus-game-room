# Halieus Game Room architecture — 3.6.3b

## Production authority

`https://halieus.remotewire.net` → Oracle HTTPS/nginx route → `halieus-game-room` systemd service → Node server/client production build.

Persistent accounts and game/session data remain under `/var/lib/halieus-game-room`; routine application releases do not replace that directory.

## Release boundaries

- **Start:** browser/app-shell launch only.
- **Restart:** browser/app-shell restart only with cache-busting query parameters.
- **Update:** explicit application release only. It packages the exact release inventory, uploads it, builds a candidate outside the live directory, verifies the candidate fingerprint, then atomically activates it.
- **Provisioning:** separate `dev-tools/Oracle Quick Deploy/provision-oracle.sh` operation for machine setup. It is never part of Start/Restart/routine Update.

## Release identity

`VERSION` is the human-readable identity. `RELEASE.json` is the cryptographic identity. `scripts/release-integrity.mjs` hashes production source, deployment scripts, launchers, the 3.6 regression contract and release documentation. The generated fingerprint is compiled through `shared/release.ts` and exposed by `/health`.

## UI isolation rules

3.6.3 keeps the rule that layouts are fixed without a global zoom/scale override. Fixes are page/game scoped.

- **Ludo:** protected reference implementation. No 3.6 selectors target Ludo and its screen/server source hashes are fixed in the regression suite.
- **Poker:** table/betting/gameplay source protected. Only `.poker-room-panel-slot` CSS may alter the Live Room presentation.
- **Mega Board:** `GameBoard` observes the actual centre frame and sets `--mega-board-size` to `min(frame width, frame height)`. Side player rails own their overflow. Autopilot sits in the existing match metadata row beside Status and does not participate in board sizing.
- **Create/Join overlays:** `HomeScreen` portals them to `document.body` or the actual fullscreen element, preventing transformed/animated page ancestors from becoming the containing block.
- **Game Room sidebar:** fixed desktop rail; main content owns vertical scrolling.

## Native social invitations

The account platform owns lightweight live-game invitations. `POST /accounts/game-invites` accepts a recipient, game and room code only when the authenticated sender is actually a human player in that live room. Invites are stored with a short expiry, filtered out when the room disappears, and can be dismissed by the recipient. They expose no hidden game state—only public room identity already present in `HalieusLiveRoomSummary`.

## Owner surface

Owner operations retain the existing account/admin backend. The 3.6 UI separates the jobs into Overview, Players, Invites, Rooms, Audit, Test Lab and Account views rather than rendering every operation in one giant vertical form.

## Rollback baseline

3.5.27 is frozen under `dev-tools/Oracle Quick Deploy/Backups`. Its SHA-256 is asserted by `tests/regression-3.6.3.mjs` so 3.6 work cannot silently replace the escape build.

## Retired module boundary

The pre-3.6.7 WHOT and Blackjack implementations are retained only under the documentation archive. The active server registers isolated 3.6.7 rebuild modules for both games, while Cheat and Dominoes use the shared classic-table room framework. Historical session/stat types remain readable; active runtime code does not route back through the retired implementations.

## 3.6.3b version suffix rule

Letter suffixes are public minor-polish identifiers (for example 3.6.3b). npm workspace metadata uses the SemVer-compatible equivalent (3.6.3-b), while the Halieus UI, VERSION file and release fingerprint use the compact public form.
