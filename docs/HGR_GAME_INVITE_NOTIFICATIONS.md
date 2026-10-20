# HGR game invitations and notifications — 4.5.5r

Date: 20 October 2026
Status: source candidate, subject to tests, GitHub CI, Oracle fingerprint and owner acceptance.

## Owner request
Users can invite one another into games directly in HGR. A recipient should get an unobtrusive drop-down inside the website or installed PWA, with **Accept/Join room**, **Decline** and **Later**, while preserving a durable Inbox. This is independent of friendship acceptance and guild membership. Real background push for a PWA that has been completely closed is a separate phase.

## Existing capabilities preserved
- `POST /accounts/game-requests` creates an authenticated request to play a game; recipients can accept/decline via the recipient-checked `/respond` endpoint. When accepted, the server allocates a room code. Invitations expire after 24 hours.
- `POST /accounts/game-invites` creates a 2-hour active-room invite only when the sender is a human in that room. Recipients can dismiss their own invite. Existing room join logic still verifies a valid room and available seat.
- HGR Friends, Guild contacts and player profiles already expose request/invite actions. The site Inbox already stores pending requests, accepted requests, room invites and guild invitations. HGR's service worker can show browser notifications when a notification payload arrives, but a full Web Push subscription/delivery pipeline has not been verified and must not be advertised as complete.

## 4.5.5r — small UI and PWA-open batch
- A polling-independent invitation channel reads `/accounts/game-requests` and `/accounts/game-invites` every 10 seconds and on page visibility return. Failures from guild invitations, stats, quick-play or live-room discovery cannot block these two reads. It does **not** increase polling frequency.
- A single top-area, safe-area-aware, in-app drop-down presents the newest pending authenticated game request or unexpired active-room invite while the main HGR lobby is mounted. On a game request, **Accept** calls the same recipient-only server response route as the Inbox and opens that game's create-room flow. **Decline** sends the corresponding decision. A room invite's **Join room** opens its exact game/code in the existing join screen; joining is still subject to the server's live-room checks. **Decline** invokes the recipient-only room-invite dismiss endpoint.
- **Later** closes only the transient notification; the server-stored invite remains available in the Inbox. **Inbox** opens the durable Inbox. No auto-decline, auto-join, auto-create or loss of an unfinished invitation.
- Notifications are scoped to the authenticated account and only pending, unexpired, inbound items. Local, bounded seen-ID caches avoid spam during each 10-second poll and after reload; the transient-pop-up and system-notification channels have separate seen caches. Dismissing a pop-up does not change invite status. Storage errors must never block accepting or declining.
- While the PWA remains open or suspended with its page/service worker available, an opt-in browser notification may appear on a backgrounded page when `Notification.permission === 'granted'`. Tapping it opens `/?inbox=1` and, after account authentication, opens HGR's durable Inbox. No permission request occurs without a user gesture; enabling permission remains an explicit UI option.
- No new HGR H icon or launcher art was created; the drop-down uses existing approved game icons and Balanced HGR text families. Scroll is bounded, action buttons are at least 44px high, and reduced-motion users have no drop-in animation.

## Explicit boundaries and next batches
- This patch is **foreground lobby/PWA notification UI**, not genuine device-wide Web Push after the browser/PWA has been fully closed. Reliable offline delivery requires secure per-device subscriptions, VAPID key management, server-side event enqueue/delivery, expiry and revocation, authentication, origin checks, and platform-specific permission acceptance.
- HGR's messaging backend, chat-message notifications, in-game HUD notifications when HomeScreen is unmounted, guild invitation pop-ups and optional notification preferences need independent design and tests. Do not claim they are already implemented by this patch.
- No user identity/handle enumeration, social privacy rule, scoring system, game room security, tournament integration or Tailscale Control functionality changes.

## Verification
- `tests/runtime-game-invite-notifications-4.5.5r.mjs`: recipient-only, pending/expiry, ordering, storage-bounded and account/channel-isolated dedup.
- `tests/browser-game-invite-dropdown-4.5.5r.mjs`: actual React actions, typography/layout, no fixed mobile nav occlusion, no horizontal overflow at 320/360/390/430/820/1440.
- `tests/regression-game-invite-dropdown-4.5.5r.mjs`: source API contract and PWA Inbox deep link. Include tests in future HGR regression tasks.
- Full HGR regression, production build, release CI and deployment verification are independent gates. Until completed, this is a local source candidate only.
