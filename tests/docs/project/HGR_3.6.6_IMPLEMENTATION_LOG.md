# HGR 3.6.6 implementation log

## Word Game direction
Word Game is intentionally single-player. The approved six-row/five-column puzzle mechanic remains intact, while the surrounding page is rebuilt around personal daily competition rather than a multiplayer scoreboard.

## Implemented
- Daily / Practice room modes.
- Deterministic server-wide daily word and daily puzzle key.
- Server-enforced one-human-seat Word Game rooms with zero AI seats.
- Daily failure finalization after six attempts.
- Authenticated leaderboard aggregation from finalized session archives.
- First-attempt-per-account-per-day anti-farming rule.
- Today / Friends / All Time leaderboard datasets.
- Daily solve stats, streaks, average guesses and fastest solve.
- Larger desktop puzzle stage/tiles/input.
- Collapsible secondary social room.

## Protected
Ludo layout/gameplay, Poker core table/gameplay, Mega Board board geometry/gameplay, the 3.6.4a anti-stall timer, 3.6.4b action-colour fixes and 3.6.5 Password/Anagrams AI setup remain outside this patch.
