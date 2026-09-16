# Halieus Game Room 3.5.7

## Scope

3.5.7 locks in the approved WHOT visual direction and includes the two mobile/account corrections reported during the same review.

- WHOT now uses deliberate far-rail/side-rail seating rather than a loose upper semicircle.
- The burgundy felt, turn focus, market/play piles and local hand are compressed into a clearer table hierarchy based on the approved mock-up.
- Shared Room / Chat / Game Log / Spectators activity is docked directly beneath WHOT with compact room/player information.
- WHOT receives the approved cream-card / burgundy two-card icon treatment without `CALL SHAPE` copy.
- Poker icon cleanup: the small rear-card P is now an Ace while the front card keeps the Poker identity.
- The mobile Game Room header no longer renders the Halieus brand as a grey browser-style button; H, Join, fullscreen and account controls use one compact baseline.
- New active account invite codes can be deliberately revealed, hidden and copied again by an authenticated Owner/Admin until used, revoked or expired. Older codes created before 3.5.7 cannot be reconstructed from their hashes and must be replaced if full-code reveal is required.

## Security note

The admin snapshot still returns only invite metadata/last-four. Full invite codes are returned only from an authenticated administrator reveal endpoint and the stored reveal copy is cleared when an invite is used or revoked.

## Validation

- Client TypeScript: PASS.
- Server TypeScript: PASS.
- Server production build: PASS.
- Full historical regression/integration chain through 3.5.7: PASS.
- Dedicated 3.5.7 regression: PASS.
- Linux Vite production bundle is not claimed from the reused Windows dependency tree because the Rollup Linux optional native binary is absent. Oracle `npm ci` remains the production build path.
