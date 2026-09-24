# HGR 4.5 Foundation Implementation Log

Status: **in progress**  
Repository version remains **4.1.1** until 4.5 receives validation and visual acceptance.

## Implemented foundation

- Replaced cosmetic player-card ellipses with a shared functional overflow menu.
- Connected real player actions: profile, join/spectate active room, game-request flow, active-room invitation and username copy.
- Replaced the earlier faceted H experiment with the approved matte serif/slab H direction, using yellow/gold as the default Halieus identity treatment.
- Added a compact Theme Library architecture while retaining System / Light / Dark and immediate Custom access.
- Added twelve more expressive coordinated theme profiles.
- Kept legacy Blue / Red / Green saved modes compatible.
- Added text-size and interface-density preferences without arbitrary font replacement.
- Preserved theme/profile choice during pre-React first paint.
- Added a cosmetic skin catalogue for Interface, Cards and Mega Board.
- Added unlock requirements based on real game history.
- Kept normal Owner/Admin accounts subject to normal cosmetic unlocks.
- Added session-only all-skin preview while Beta/Test Lab is active.
- Added first applied skins for shared interface framing, Poker/Blackjack hidden cards and Mega Board field atmosphere.
- Added shared HGR geometry tokens for radii, control sizing and spacing.
- Added the first shared website surface grammar on the Games page: consistent category headings, count chips, card geometry, artwork safe areas, status chips and responsive spacing without replacing existing game artwork.
- Extended the same surface grammar into Guilds: page heading hierarchy, grouped actions, list/detail surfaces, count chips and selected-row treatment now use shared HGR tokens rather than a separate visual language.
- Extended the platform surface grammar into Account / Owner Tools: header, content cards, section headings, fields, focus states and notices now inherit shared HGR theme tokens instead of the older fixed blue admin palette.
- Extended the same grammar into persistent game chrome, the shared Game Menu and the Mega Board waiting room: shared SVG menu icon, modal/action rows, timer/recovery panels, lobby overview tiles, roster and side-control cards now consume the platform HGR surface tokens without changing game logic or artwork.
- Unified the title/room/status strip across Poker, the Blackjack/WHOT rebuild family, Ludo/Connect Four/Ayo/Word Board/Hidden Dictator, Word/Password/Anagrams, and Cheat/Dominoes. Each game keeps its own artwork/accent while title hierarchy and room/mode/status chips now follow one platform contract.
- Formalised the game visual identity process while keeping the current website artwork as the source of truth.
- Recorded the failed multi-game mockup iterations as exploratory only and documented a rollback-first visual review discipline so approved designs are not changed while fixing unrelated assets.

## Deliberately not claimed complete yet

- Final launcher/PWA raster and ICO regeneration from the new H.
- Full visual review on every game and breakpoint.
- 4.5.0 release/version bump.
- 4.5 source-baseline freeze.
- Additional game-specific cosmetic slots beyond the initial Interface / Cards / Mega Board foundation.

Those occur only after validation and human acceptance.
