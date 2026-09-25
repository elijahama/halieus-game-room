# Part 17 Stage 2A — classic-table lifecycle

Base: approved Stage 1 commit `410e0af9047041b56b9b5981b245792c6959a000`. Scope is Dominoes/Cheat lifecycle only. VERSION remains 4.5.0 and Build Info remains Build 4.5. No timer, theme, branding, layout, progression or deployment work.

## Before-change findings

The shared handler used `lobby | playing | finished`, one room creation timestamp, a nullable startedAt and a winner field. Host End selected the lowest remaining hand/pip total and called `finishRoom`, which always archived `completed`, including before Start. Start had no phase guard and retained the old startedAt. All rematches used the room creation time as their archive key, so the archive deduplicator treated them as the same session.

Before editing, two human Socket.IO clients and a spectator were exercised against Stage 1 for **each** game. Current-turn network loss and explicit Leave retained the turn with the seat marked disconnected. Recovery restored the hand/turn under the new socket ID and preserved startedAt. Non-current disconnect and spectator disconnect did not award a winner or change the turn. Observations included 900 ms waits for disconnected/left current players; the source has no grace timer at any longer interval. This establishes the existing recovery behavior, not a newly defined timeout policy.

## Authoritative outcomes

- `outcome: null` means no adjudicated result yet.
- `cancelled / host-closed` has no winner and `countsAsCompletedPlay: false`. Phase may be finished without implying a completed match. Unstarted cancellation retains `startedAt: null`, `matchId: null` and `started: false`.
- `completed` requires a started match and a game-specific terminal reason: `dominoes-empty-hand`, `dominoes-blocked` or `cheat-final-claim-accepted`.
- `forfeited / last-player-remaining` preserves the existing explicit-forfeit result when only one participant remains. Network loss and Leave never enter this path.
- Each outcome records its end time and winner ID where applicable. Finalization is guarded by the existing outcome; repeated End acknowledges the same state and cannot replace a legitimate completion or create another archive.

Host End now closes administratively during a lobby or active play. It does not calculate a leading player. Cancelled rooms display a neutral closure message using existing styles, with no podium or Play Again. A cancelled room must be replaced with a new room. Legitimate result screens remain in use.

## Preserved game rules

Dominoes empty-hand wins require a legal play. Blocked completion requires an empty boneyard, a full round of consecutive passes and no playable tile in any remaining hand. The existing lowest-pip rule is unchanged; equal pip totals resolve by seat order. Deterministic tests explicitly preserve that tie break.

Cheat still requires acceptance of the final empty-hand claim for the existing normal win path. Its claim/challenge rules are not replaced with Dominoes rules. Shared Start/End/Forfeit guards and archive identity apply to both games.

Explicit forfeits retain the existing seat-removal/continuation behavior. The archived participant list now retains forfeiting players rather than losing them from valid match history. Forfeit outside active play is rejected.

## Match identity and rematch

Only a lobby or a legitimate completed/forfeit result can start, with at least two current participants. Starting during active play is rejected before dealing or mutating lifecycle state.

Each successful Start assigns a fresh, monotonic timestamp and `matchId = game-roomCode-startedAt`. A rematch resets outcome, winner, results, action log, departed participants and game state. Action sequence remains monotonic within the room. Client selections/confirmation state reset when matchId changes.

The existing archive API receives the match timestamp instead of the room creation timestamp; the archived state still includes original room.createdAt. This narrowly produces independent archive keys without changing sessionArchive or any other game's lifecycle. Lobby working snapshots may remain operational working records; they are not completed-play history.

Start, End, Forfeit and gameplay mutations carry the expected matchId. A delayed request from a previous match is rejected; unstarted lobbies accept the null identity. Clients loaded before this protocol change must refresh/recover before sending active-match actions. Recovery requests are deliberately exempt, so they can discover the authoritative current identity.

Archive payloads are cloned synchronously before asynchronous finalization, preventing a rematch/reconnect from modifying an earlier result while it is being written. Reconnecting a finished winner updates the current public outcome ID without rewriting the prior archive.

## Recovery policy

Transient disconnect and explicit Leave preserve the seat, hand and turn. No immediate forfeit, AI takeover, timer expiry or abandonment scoring was added. A current-turn player who never returns can still cause an indefinite wait. A connected host may cancel without awarding a result; if the host is unavailable, recovery is required. A timed grace period, host succession on disconnection or an abandonment rule needs a separate product decision.

The public state includes only the viewer's own recovery token; spectator state contains none. This restores saved recovery when Play Again starts after the previous finished state cleared the saved session. Detached seats cannot send gameplay mutations before recovery. Spectator disconnect now broadcasts the corrected spectator count without changing the game result.

## Archive, statistics and downstream effects

Administrative closure is archived as existing `host-ended`, with null winner, typed cancellation and false completed-play eligibility. Legal finishes use `completed`; valid last-player forfeits use `forfeit-completed`. No new archive status or shared archive implementation was needed.

Account history previously counted every finalized file, irrespective of status. The reader now excludes **classic-table only** records that never started, have non-completion archive status or explicitly carry false completed-play eligibility. This protects personal played/win counts, recent history and quick-play preferences. Other games' account-history policy is untouched.

Guild projection already treats host-ended as ended rather than completed, and receives a null winner. Classic-table has no direct Elo/rating update hook. No achievements or Gamer Score implementation was added. Future progression must honor explicit eligibility and valid outcome/status, not phase alone.

Guild reservations currently project only while their status is setup. A rematch has its own canonical archive/account history, but this patch does not add a new guild reservation/history row for each rematch or overwrite the prior guild result.

The shared archive's existing disk-write/idempotency and guild-projection mechanism remains unchanged. This patch prevents repeated lifecycle requests from invoking it again and gives rematches separate keys. It does not redesign crash recovery, storage-error retry or durable guild-projection replay. Finalization failures are logged rather than becoming unhandled rejections.

Older invalid unstarted classic archives are excluded from account statistics, but their files are not rewritten. Older active host-ended archives misleadingly stored as completed cannot reliably be distinguished from legitimate historical results without a migration policy.

## Tests and validation

`npm run test:classic:lifecycle` runs real Socket.IO clients against an isolated source server, with deterministic shuffling supplied only by a test-process fixture. No production debug API is introduced. It covers:

- Lobby and active cancellation, missing winner, host authorization, no played/win/quick-play effects.
- Repeated Start with unchanged hand/identity, repeated End and immutable legitimate results.
- Legal empty-hand and blocked Dominoes finishes through public actions; explicit pip/seat tie fixtures.
- Fresh rematch identity and startedAt, stale-request rejection, reset state and independent archives.
- Current/non-current/spectator disconnect, explicit Leave, recovery and a successful post-recovery action for both games.
- Private recovery-token boundaries and hand redaction for spectators.
- Cheat accepted-final-claim completion/rematch and explicit two-player forfeits for both games.
- Retained forfeiting participants, unique finalization/index entries and exact account play/win counts.

The test joins the full regression chain and works before production build via the existing tsx dependency. Stage 1 preparation, integrity, typecheck, build, production-browser identity and local Oracle package preflight remain required. Regenerate fingerprints using the existing generator, never by editing shared/release.ts manually.

## Remaining boundaries

- No timed disconnect/grace/abandonment policy is defined or invented here.
- Existing multi-seat forfeits remove that seat's cards/tiles; redistribution and pending Cheat-claim policy are not redesigned.
- Cheat's separate truthful-final-claim challenge path was not redesigned; accepted-final-claim coverage must not be read as exhaustive Cheat rules certification.
- Rooms remain in-memory; working archives are not an automatic server-restart restore mechanism.
- No historical archive repair, shared archive crash/retry redesign, or account identity/name-alias migration.

Do not begin Stage 2B or merge, push or deploy as part of this change.
