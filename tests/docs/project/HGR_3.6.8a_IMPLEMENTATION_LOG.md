# HGR 3.6.8a Implementation Log

## Security
- Pinned PostCSS 8.5.26, nanoid 3.3.18 and picomatch 4.0.7.
- Added regression floors so later lockfile refreshes cannot silently downgrade them.

## Ranked leaderboards
- Shared leaderboard overlay now renders above Create Room/game surfaces.
- Ranked setup contexts expose leaderboard access directly under the Ranked selector.
- Poker and Mega Board keep their existing dedicated leaderboard data; other ranked games use the shared ranked surface until their persistent rating tables are populated.

## Game icons
- Shared game icon component propagates each game's accent.
- Library, create/join, featured and in-game brand icons use a consistent 2px accent outline with consistent offset.

## Deferred
- Cross-version active-room persistence/migration remains a future numeric-release infrastructure item.
