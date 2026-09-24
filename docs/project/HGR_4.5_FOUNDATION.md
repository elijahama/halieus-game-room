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
- Unified the outer result ceremony shell across Mega Board and the shared non-Mega results system: hero hierarchy, result tabs, ranking/stat/award surfaces, footer/actions and responsive framing now inherit HGR tokens while scoring, awards and game-specific result data remain untouched.
- Added active-game browser-tab identity without redesigning icons: the tab title and favicon now switch to each game's existing catalogue SVG while inside that game and restore the Halieus identity on return to the platform.
- Restored launcher artwork to a reference-led protected asset model: approved launcher files live directly under `assets/branding/launchers/`, reference PNGs under `assets/branding/references/` are authoritative, and shortcut/preview scripts may not redraw or overwrite production icons.
- Unified the pre-React first-paint H and default SVG favicon with the same canonical Halieus H geometry used by the shared React brand mark.
- Unified Create Room, Join/Watch, invitation panels and direct invite-join screens under the same HGR modal/field/inset-card grammar while preserving each game's current artwork and room behavior.
- Unified Inbox, room chat/game-log/spectator activity, confirmations and toast/global-notice framing under the same HGR communication surface language. The room-chat trigger now uses a shared SVG glyph, and the last decorative sidebar profile ellipsis was replaced with a truthful navigation chevron.
- Unified the pre-sign-in Account Portal and Ranked leaderboards with the signed-in HGR shell. Account entry now uses the canonical shared Halieus mark and SVG fullscreen control; Mega Board, Poker and generic ranked modals share one HGR surface/table/podium hierarchy without changing auth or rating logic.
- Formalised the game visual identity process while keeping the current website artwork as the source of truth.
- Recorded the failed multi-game mockup iterations as exploratory only and documented a rollback-first visual review discipline so approved designs are not changed while fixing unrelated assets.

## Deliberately not claimed complete yet

- Final human visual verification of the complete launcher/browser/PWA identity set against the approved reference folder. Launcher artwork is not regenerated automatically.
- Full visual review on every game and breakpoint.
- 4.5.0 release/version bump.
- 4.5 source-baseline freeze.
- Additional game-specific cosmetic slots beyond the initial Interface / Cards / Mega Board foundation.

Those occur only after validation and human acceptance.

- Added a board/table cosmetic architecture separate from the global HGR theme: Mega Board and Poker now have independent visual-surface slots while preserving gameplay geometry.
- Added original retro-console-inspired HGR families (8-bit Ivory, 16-bit Lavender, Black Drive and Grey Disc) as both platform profiles and matching game-surface cosmetics.
- Added real progression metadata for starter, play-count, win, rating, achievement, guild and seasonal unlocks. Mega Board can consume its existing ranked rating; Poker deliberately remains play/win-gated until its rating model is live.
- Added free muted competitive alternatives for Mega Board and Poker without replacing either game’s approved default layout.

- Added global ranking context inside Guilds without creating a second Elo system: current guild members inherit their real Mega Board global rank/rating where available, while guild-only W/L remains a separate record.
- Guild-only records now require the full recorded human party to match a frozen pre-match guild-membership snapshot. Later joins/leaves therefore do not rewrite whether a completed room qualified as an all-guild match.
- Poker's live side rail now uses a pinned hand plus Actions / Players / Chat workspaces; Autopilot opens on demand and only the selected workspace scrolls on constrained viewports.
- Confirmed and regression-locked the existing Mega Board host turn-timer selector and server-authoritative timer update flow without redesigning the approved Mega Board layout.
