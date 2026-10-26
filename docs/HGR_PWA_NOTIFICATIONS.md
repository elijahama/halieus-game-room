# HGR 4.5.5r–t — Game invitations and PWA notifications

## Owner requirements (20 October 2026)
- Game invitations can be sent inside HGR; recipients get a compact dropdown and can **Accept**, **Decline**, **Later** or open **Inbox**.
- Installed HGR PWA can show notifications when a new invitation or guild message is received, including when the app is not foregrounded, **after explicit user permission**.
- Guild messaging, friend requests, game requests and room invitations are retained in existing HGR social systems. The UI must not conflate guild membership with friendship, and tournament mode remains on hold.
- Use canonical app icons unchanged. Do not introduce new H artwork.

## 4.5.5r — Existing game invitation dropdown
Already implemented/CI published. The authenticated recipient's pending game and room invitations are separately polled on the normal 10-second cadence. Foreground users see a safe-area-aware top dropdown. Accept/Decline call existing server-authoritative recipient-scoped endpoints; **Later** mutes the transient card only, not the persistent Inbox. Room joining still validates the current game-room seat. Existing PWA service worker handles notificationclick deep links.

## 4.5.5s — Guild messages and shared Inbox
- Add authenticated `GET /guilds/message-notifications` returning a bounded list of the signed-in account's **current guilds** and messages posted **after membership began**, excluding self/system posts, limited to 14 days and at most 60 total. No chat exposed to strangers, nonmembers or other accounts.
- Client polls messages independently of game/live stats, adds unread count and message previews to the existing Inbox, and shows one small in-app dropdown at a time with **Open chat / Inbox / Later**. The in-app popup does not mark the message read.
- Read keys are account-scoped browser localStorage, separate from popup-seen keys. **Mark read** or **Open chat** clears the badge; loss of browser storage may reset local read state, but server chat content remains.
- Direct navigation opens the intended guild's chat view, with the existing guild permissions. Friend requests also appear in the shared Inbox with recipient-only Accept/Decline.
- Portrait popup/browser tests cover 320, 360, 390, 430, 820 and 1440px, action taps and non-overlap with bottom navigation.

## 4.5.5t — Real background PWA Push
- Use the standard Web Push protocol (`web-push` npm package), not fake polling that claims to work after the PWA is closed.
- Server lazily creates persistent VAPID keypair and stores its **private key and subscriptions** only at durable ignored `HALIEUS_DATA_DIR/notifications/push-subscriptions.json` (Unix mode 0600). `GET /accounts/push/config` returns only the public key and only to authenticated accounts. Never log or commit private keys.
- Users must press **Enable PWA alerts** and grant browser/OS permission. Register a browser endpoint for the current account with topics `invites` and `messages`. Separate authenticated status/subscribe/unsubscribe endpoints preserve user choice. Rebinding a browser endpoint to another account revokes the old account's association; another account cannot unsubscribe that association.
- Validate HTTPS browser push endpoints against known Apple, Mozilla, Google and Windows Push service providers; reject arbitrary URLs, private hosts, invalid encryption keys and unrecognized topics. Cap registered endpoints to 5 per account.
- On successful new game requests, live-room invites, friend requests, guild invitations and guild chat messages, the server queues notifications only to the authorized recipient(s). Delivery is best-effort, and failure can never reject or roll back the player's original action. Invalid/expired subscriptions (404/410) are removed.
- **Lock-screen text does not include guild chat bodies.** A notification tap opens HGR's Inbox or the membership-checked guild chat via `/?guild=<id>`. Existing cached/hidden-tab fallback is suppressed for devices with active push subscriptions to avoid duplicate system alerts.
- Browser push requires HTTPS, compatible device/browser, and OS permission. On iPhone/iPad, Web Push requires installing HGR to the Home Screen and using a supported iOS/iPadOS version. In-app notifications work while HGR is open even when OS push is unavailable/denied.
- The release includes opt-out in the same UI. Push data is private, not part of account data export, developer-directory lists or public responses.

## Validation and release discipline

### Subsequent active-game return source candidate

See [Mega Board foreground return](HGR_ACTIVE_GAME_RETURN.md) for the separate 4.6.5 review candidate and exact verification limits. Parent runtime security and 390/820px component tests passed; observational receipt `rcpt_bf69d18797384553936bc243a4c631dd` is not independent attestation, full-App E2E or physical-PWA acceptance. This card needs no OS notification permission and polls only while the hub is visible; focus/online refresh reconciles current account-owned live seats. It reuses browser recovery credentials and never forces another device out. Existing invites/messages push consent does **not** authorize game decision push. Background game alerts, new match-topic preferences and account-only cross-device reclaim remain unfinished separate work. No new service-worker background behavior is shipped; candidate preparation is not merge/deployment evidence.
Tested real isolated server membership/privacy (guild sender/recipient/stranger), web-push subscription registration, invalid provider/SSRF rejection, private VAPID secrecy, cross-account binding and revocation, and source-level delivery hooks. Full production typechecking, regressions and browser viewport QA must pass before publication. Actual closed-PWA push arrival on an owner device still requires user acceptance; local mocks are **not** that evidence.

Release as independently audited commits `4.5.5s` and `4.5.5t` if the index can separate source safely; never force-push or stage generated `RELEASE.json` / `shared/release.ts` from a dirty worktree. Document GitHub CI, Oracle deployment and live fingerprint **separately**. The active HGR server, canonical icon family, beta font/test labs, Daily Word scores, Ayo and tournaments are untouched by these notification patches.
