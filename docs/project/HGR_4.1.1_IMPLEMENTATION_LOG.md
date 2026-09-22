# HGR 4.1.1 Implementation Log

## Approved scope

This implementation follows the saved post-4.1.0 UI reference: Home discovery, player/social cleanup, Guild member invitations, canonical avatars, richer leaderboards, scroll-safe setup/menu surfaces, neutral Dark/Light themes, optional Blue, Custom RGB theming and per-game ambient colour.

WHOT gameplay redesign was explicitly excluded.

## Main implementation points

### Home and Players
`HomeScreen.tsx` removes Project History from Home and introduces a stateful discovery shelf. The shelf is derived from existing HGR data rather than pretending to have an external recommendation service: personal play counts, recent history, live rooms and unplayed catalogue entries provide the initial signals.

Online and recent-player shelves reuse canonical account avatars/profile pictures.

### Guilds
Guild storage now retains invitation records. Owners/admins can invite a real account by stable account ID. The server resolves the target account itself; the client cannot spoof display name/avatar data into membership.

Recipients receive pending invitations and explicitly accept or decline. Accepting creates normal guild membership and persists it in the same guild store.

Guild member rendering refreshes display identity from the account store so profile-picture changes propagate into Guilds.

### Themes
The old System/Light/Dark selector was replaced by Dark/Light/Blue/Custom.

Dark is intentionally neutral. Blue preserves the previous navy direction as an optional theme. Custom stores four palette inputs and derives readable text/border/surface tokens from them. RGB, HEX and native colour-picker controls edit the same palette.

The old `theme-transitioning` choreography is no longer triggered. Theme switching is immediate.

### Modal and debt layout
Desktop room setup and game menus use the backdrop/document as the overflow escape hatch rather than placing a scrollbar inside the modal card. Mega Board debt property actions are arranged as compact option cards so more legal liquidation actions remain visible together.

### Validation
`tests/regression-4.1.1.mjs` protects the approved 4.1.1 behaviour and is chained after the historical 4.1.0 regression.
