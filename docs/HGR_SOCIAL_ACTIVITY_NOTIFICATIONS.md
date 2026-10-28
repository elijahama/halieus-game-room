# HGR 4.6.9 — Verified social activity notifications

**Scope:** All 14 games, responsive Inbox and Friends/Discovery views. Existing game, Guild, PWA, Controller and active-room logic is unchanged. This is an opt-in-free **in-app** notification feed; browser/OS lock-screen friend-presence push is not automatically enabled.

## User-visible behaviour

- When a previously offline *visible friend or guild contact* comes online, add a concise Inbox entry.
- When that authenticated contact enters a verified HGR room, show the game title, lobby/playing state and available **Join / Watch** actions. Only active, available rooms offer those actions.
- The Inbox badge includes unread social activity. Players can mark all activity read or clear the saved local history.
- The Friends tab's "In game" filter and player actions use the same verified account-to-room mapping. The Friends-are-playing discovery shelf uses **actual accepted friend IDs**, not unrelated active games.
- First-time load establishes a baseline and does **not** pretend everybody online has just arrived. Repeated polling does not create duplicate events. Browser reconnection/focus refreshes activity without running hidden-page polls.

## Authoritative source and privacy

All room-summary adapters (Mega Board, Poker, Blackjack, WHOT, Ludo, Hidden Dictator, Connect Four, Word Game, Password, Anagrams Race, Cheat, Dominoes, Ayo and Word Board) add **server-internal** account IDs derived solely from authenticated, connected, non-Beta human game sockets. Do not derive an account ID from editable player names, reconnect tokens or usernames typed into a room.

`GET /accounts/social/activity` requires an authenticated session. It returns only the existing social-directory relationship set (accepted friends and shared guild members), filtering hidden profiles. It exposes only public game, room, status and display information that the logged-in Game Room already offers. The ordinary public live-room endpoint explicitly strips the private server-internal account ID list.

An in-app event is created by a genuine transition, not a naive equality match between display names and room players. Local Inbox entries are kept per signed-in account, capped at 40, and never sent to other accounts or to Git.

## Notification lessons from the established reminder PWA

Reuse the beneficial principles: one predictable Inbox, explicit controls, read/dismiss actions, device-appropriate delivery, a single notification click destination, and an honest **test notification** endpoint for real browser push verification (delivered separately in HGR 4.6.8). Do **not** share credentials, VAPID keys, storage files or devices with any other website.

Existing HGR opt-in background push for messages/invitations remains unchanged in this patch. Additional *friend presence* lock-screen push, turn reminders, personal quiet hours, durable read receipts across devices and web push receipt testing require a separate consent-based audited implementation; do not claim this in-app UI implements them.

## Verification boundaries

A new deterministic test covers internal identity filtering, all 14 game adapters, hidden data not being sent through public room summaries, initial baseline, online/game transitions, deduplication and no false messages for guests, AI or renamed players. Existing full regression, typechecks, build, release fingerprint and Windows/Ubuntu CI are required for release.

HGR 5.0.0 is still reserved for a fully working Mega Board Tournament Mode; this patch is unrelated to Tournament ratings.
