# HGR Part 35 — Live Game Continuity (owner-requested design)

**Recorded:** 29 October 2026  
**Status:** Requirement / specification only; not implemented, merged, tested on devices or deployed. No release number reserved.  
**Scope:** HGR platform and all fourteen games, with game-specific capability adapters; preserve existing game rules, player permissions, notifications, PWA icon family, branded H, Control, and ongoing tournament work.

## User experience and intent

When a participant switches to another phone/tablet application, presses Home, locks the device or minimizes the installed HGR PWA, HGR should remain aware of their live match. On return, offer a prominent **Continue game** action into the correct authorized session; do not make them rediscover its room. Server-owned turns, timers, opponents and legal decisions must continue under existing game rules. Do **not** turn app-backgrounding into an automatic forfeit, sign-out, pause or force-takeover. Explicit **sign out** is different: clear/guard the account's active-session UX and never reveal account-specific events to someone else on the device.

In HGR while visible, show an active-match return card or compact persistent banner (safe on mobile, tablet and desktop), plus a chronological, account-scoped event feed and unread indicator. The feed can say **Player made a decision** with only already-public action summaries, **Your turn**, **A decision needs you**, **Game paused/resumed**, **Match ended**, etc. When the user returns after missing several ordinary actions, reconcile from server state and optionally group them as **3 updates since you left** rather than displaying a burst of old pop-ups.

For opted-in installed devices, send real **Web Push** for actionable changes while HGR is hidden or the page is closed: especially **Your turn** and decisions that require the recipient. Notification tap opens the exact match or an authenticated safe return route. Public opponent moves can appear in the in-app activity feed; do not by default emit an OS notification for every dice roll, move or public decision. High-signal categories may be individually enabled and rate-limited. Provide quiet hours/notification controls and a verified **Send test notification** path using existing push infrastructure. Treat Web Push as best effort (permission, installation, OS/browser availability, power/force-stop restrictions); a website/PWA cannot promise a permanently pinned Android ongoing notification or continuously running background Socket.IO connection.

## Existing source baseline reviewed (main @ 3b046b50731dbf689c5329900e6933aefcd44075)

- `client/src/platform/components/ActiveMatchNotice.tsx` and `server/src/platform/active-match.ts`: authenticated **Mega Board-only** match card, polled at 10 s while visible, most recent explicitly public completed decision, token-backed same-device return, no forced seat takeover.
- `client/src/platform/socialActivityNotifications.ts` and `docs/HGR_SOCIAL_ACTIVITY_NOTIFICATIONS.md`: account-scoped foreground social presence/activity feed; this is **not** an in-game turn-alert pipeline.
- `server/src/platform/pushNotifications.ts`: durable opt-in per-device VAPID push topics `invites`, `messages`, and owner/admin `operations`; **no gameplay-turn topic**. Preserve existing subscription security and revocation.
- `client/public/sw.js`: push handler and notification click routing are available. Need match-specific tags/deep-link validation, account/session reconciliation and stale-notice handling.
- `docs/HGR_NOTIFICATION_DELIVERY_PARITY.md`, `docs/HGR_PWA_NOTIFICATIONS.md`, `docs/HGR_ACTIVE_GAME_RETURN.md`: existing constraints and incomplete future work. No claim of actual device receipt or general cross-game resume.

## Event classes and delivery

| Event class | In-app feed | Optional device push | Visibility |
| --- | --- | --- | --- |
| Your turn / a time-sensitive decision needs you | Yes, prominent | Yes, opt-in, high priority | Only the legitimate active participant |
| A public player decision completed (move, trade, purchase etc.) | Yes, concise, with game-specific text | Off by default; optional digest if later approved | Only public information to authorized match members |
| A match starts, pauses, resumes or finishes | Yes | Optional; opt-in | Eligible participants, respect spectator/role rules |
| Player disconnects/reconnects | Contextual room indicator | Off by default | Avoid account presence leakage |
| Stale or ended match | Clear current action banner; retain appropriate read-only history | No new action push | Reject deep-link reconnect attempts |

## Engineering boundaries

1. **Server authority:** Add a game-neutral, authenticated active-match/query model with one audited adapter per game; never infer seat ownership from display names, raw room codes, guessed game identifiers, guest records or private recovery keys. Do not leak secret roles, private hands, pending choices, hidden events, or nonmember actions. Spectators receive only permitted information.
2. **Resume and deep links:** Use match IDs and valid account/session/recovery eligibility. Revalidate on notification click and on return. Respect paused/finished/expired/forfeited states and seats connected on another device; do not silently use `force: true`. If invalid, open HGR to a clear “Match no longer available” status rather than a dead game screen. Browser/tab switching and PWA relaunch should not require recreating an already valid game.
3. **Event stream:** Produce server-confirmed turn/action/lifecycle events and recipient-scoped IDs; a single idempotent event should not duplicate across socket reconnection, polling, focus, app restart or multiple tabs. Persist bounded unread/read state per account; returning after missed events must query current state, not trust cached toasts.
4. **Delivery channels:** In-app socket/event feed while connected, authenticated reconciliation after visibility changes, and server-originated Web Push only for opted-in account-bound devices. Do not claim that hidden-page JavaScript timers or Socket.IO work when OS suspends/kills the PWA. Existing push topics, private VAPID keys, and send-test security must remain intact.
5. **User control:** Distinct toggles for turn alerts, critical game decisions and optional public-action summaries/digests, per device. No automatic notification permission prompt; quiet hours and mute per match where feasible. On logout, account switch, revocation, forfeit or completion, stop serving stale account actions. Permit safe opt-out.
6. **UI integrity:** Compact floating/bottom-safe return prompt, no overlap with five-item mobile nav, game HUD or Android PWA install prompts. Do not exit fullscreen unexpectedly on resume. No artwork redesign, no replacement H geometry, no broad CSS regression.

## Proposed independently auditable batches

- **A — Match awareness and return:** Inspect all fourteen game/session adapters; generalize active-match discovery and ensure **Continue game** works with current account, token, room and lifecycle checks. Keep Mega Board recovery safeguards and reconnect semantics unchanged.
- **B — In-app game events and Inbox:** Define server-confirmed game event schema, public/recipient visibility, event history/unread and actionable turn banners. Start with Mega Board plus one simple turn-based game, then additional game adapters in small tested groups. Do not mislabel partial adapters as “all games completed.”
- **C — Optional game-action Web Push:** Add dedicated gameplay topic(s) to existing VAPID subscription system, recipient routing, coalescing/dedupe, deep links and preference UI. Never add a hidden OS-push feature to an existing invites/messages consent.
- **D — Device acceptance and expansion:** Test switching apps, locked Android, installed Android PWA, tablets, denied permission, app terminated, cross-account and cross-device, paused/ended/forfeited match, stale push click, no network, duplicate events, secret-information rules, and normal timeouts. Run regression/typecheck/build/Windows+Ubuntu CI, release integrity and final Oracle fingerprint checks before any delivery claims.

**Release:** Do not attach an implementation version simply because this requirement is documented. Keep it separate from 4.7.3 Control changes and 5.0.0 tournament acceptance; choose a version only for a validated implementation batch.
