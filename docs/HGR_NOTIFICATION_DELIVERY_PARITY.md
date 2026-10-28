# HGR notification delivery parity — Logic & Philo reference

**Source audit:** 28 October 2026. Logic & Philo is a separate private project; do not share its VAPID keys, subscription registry, hostname, private content or user data with HGR.

## What we verified

Logic & Philo v1.3.0 uses its own bell, persistent per-device inbox, unread badges, read/dismiss controls, per-device opt-in, a **Send test notification** button, a web-push server, a service worker that opens the relevant page on tap, and a 30-second scheduler for its own Mon/Wed/Fri/Sun study reminders. The Oracle scheduler runs when the page is closed. Permission alone cannot prove the OS showed a push; a user device test is still required.

HGR already has a signed-in Inbox and game/guild invitations, game-request popups, connected-player directory, live-room list (polled at roughly 10 seconds), and background push via its own VAPID key and web-push to opted-in account-associated devices. Push topics currently support **invites** and **messages**, not presence, gameplay or turns. HGR's background pushes appear in the device notification shade, but a deterministic user-triggered delivery test was missing.

## First safe batch — test push delivery

Add a **Send test notification** control to HGR's existing account PWA notification settings, visible only after an enabled subscription on that device. The authenticated server accepts only that same account's previously registered push endpoint. Bound repeated tests to 30 seconds, reject arbitrary/non-HTTPS hosts, expire stale subscriptions, and return an honest **submitted to gateway** message rather than claiming the OS displayed a notice. Never include other players' information in a test payload.

This batch changes no room logic, account relationships, notification artwork, social permission scope, gameplay or existing delivery types. Source validations do not replace a real opt-in phone/PWA test.

## Next audited batches — player activity

1. **Live friends and games:** provide user-controlled, opt-in **in-app** alerts for friend-online transitions and friend-in-game transitions. A friend is an accepted friend only, not every guild peer or member of a public room. Derive transitions from server-confirmed account IDs; current public room summaries only contain display names and **cannot safely establish the actual account ID**. Implement a privacy-safe room-participant account-ID link before advertising that a named friend is in a named game. Respect hidden/invisible accounts.
2. **Inbox continuity:** retain alerts, unread/read/dismiss markers per account, not only a transient toast. Do not replay old presence notifications on first connection, refresh, sign-in or account switch. Deduplicate reconnects, stale/unknown states and repeated room polls; avoid notification spam.
3. **Turn and match events:** use server-confirmed game start, your-turn, invited-room-ready, match resumed and completion events across **all fourteen games**, where applicable. Respect spectators and secret-role visibility. Deep-link to the actual room; prevent outdated notifications from reopening ended matches.
4. **Background push preferences:** extend HGR's existing opt-in per-device push topics for friend activity and turn alerts only after recipients, privacy, persistence and idempotency are verified. Add a quiet-hours preference and permission-safe toggles. Don't reuse Logic & Philo study schedules: HGR is event-driven.
5. **Device acceptance:** verify Android browser/PWA, tablet, foreground/background, permission denied, push gateway unavailable, multiple signed-in accounts, read/unread persistence, delayed server notifications and cross-device consistency.

## Release boundary

Proposed **4.6.8** after the 4.6.7 Control/unlockable patch. No production roll-out or delivered-notification claims until the merge, build, Oracle deployment fingerprint and real Android test have been verified.
