# Halieus Game Room 4.1.1

4.1.1 is the first polish pass after the 4.1.0 Guilds foundation. It implements the approved Game Room/social mockup while deliberately leaving WHOT gameplay redesign for a later pass.

## Player-facing changes

- Home no longer renders Project History.
- Game discovery now has Featured, Most Played, Recommended, Recently Played and Friends Are Playing shelves.
- Online and Recent Players use compact social strips.
- Player directory fills the available canvas instead of leaving an empty half-screen.
- Guild creation/joining is visually rebalanced.
- Guild owners/admins can search existing HGR accounts, send direct guild invitations and see pending invitations.
- Invite recipients can accept or decline persistent guild invitations.
- Guild member avatars resolve against the canonical account identity, including uploaded profile pictures.
- Ranked Mega Board standings add a top-three podium while preserving the full data table.
- Dark is a neutral black/charcoal mode; Blue is now an explicit optional theme.
- Custom theme mode supports persisted Background, Panel, Primary and Secondary colours with colour picker, HEX and RGB controls.
- Theme changes apply immediately with no Light/Dark transition animation.
- Game-card ambience follows each game's own identity colour.
- Room-creation and game-menu surfaces no longer trap a second internal scrollbar.
- Mega Board debt/liquidation property actions use a compact multi-column choice layout on desktop.

## Engineering changes

- Direct guild invitations are persisted server-side and validated against canonical HGR accounts.
- First paint understands Dark, Light, Blue and Custom themes so reload does not flash the wrong palette.
- 4.1.1 adds a regression contract for the new social/theme behaviour.
- The 4.1.0 regression remains historical and now runs correctly against later 4.1.x patch versions.
- The 4.1.0 Oracle deployment debugging postmortem is now linked from the portfolio README.

## Intentionally deferred

WHOT gameplay/table redesign is not part of 4.1.1. The existing WHOT game remains functionally unchanged so its redesign can be handled as a focused later pass.
