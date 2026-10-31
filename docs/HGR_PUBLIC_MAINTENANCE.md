# HGR 4.6.10 — Owner-controlled public Game Room maintenance

This is a **visitor access gate**, not a Windows launcher or a process shutdown. The normal HGR Start/Restart/Close shortcuts only manage the owner PC's dedicated Edge window. The public website remains independent.

## Operation

In Control → Operations, the authenticated owner sees a distinct Public Game Room access panel with a live-room count. Close Public Game Room uses an explicit owner confirmation dialog; the server also requires the action-specific confirmation token. The server refuses closure while any live room exists (409). Reopen Public Game Room has its own owner confirmation and remains available through Control.

State is persisted outside the Git working tree in the existing private accounts data directory, in the file public-access.json. It stores only the open/closed flag, short visitor reason, timestamp and owner account ID. A corrupted existing state file fails closed for public visitors, while preserving authentication and owner Control for repair. No secret credentials, shell commands, key material or H artwork is introduced.

## Visitor behaviour and access recovery

The Oracle server keeps running. Visitor HTML navigation gets an uncached 503 page with the owner-approved maintenance message. Control, health, authenticated owner sign-in and account recovery routes continue working. The maintenance page contains an owner login form so an expired session cannot lock the owner out.

While closed, new public Socket.io game connections are rejected. The only accepted Control socket has an explicit Control flag AND an authenticated owner role. After a confirmed close, remaining public sockets are told the visitor gate is closed and disconnected. New attempts cannot create games while the gate is active. The public gate never invokes the owner-PC Close script.

A PWA navigation 503 must not overwrite the last healthy offline shell cache. A previously installed offline PWA cannot be centrally erased, so don't claim complete offline revocation.

## Security, UX, validation

- Default open; corrupt existing state fail-closed, owner recovery available.
- Owner-only GET and POST, JSON and same-origin checks, action-specific confirmation token.
- Active-room rejection across all 14 games, with no forced close during active games.
- Separate public-site card from the owner-PC window controls, responsive mobile layout.
- No automatic or unconfirmed production closure, no Oracle restart, no PWA permission changes.
- Test persistence, escaped HTML, Control login, public socket gate, live room protection, service-worker cache policy, narrow mobile layout, all regressions and release identity.

An actual production closure is a **separate explicit owner operation** after deployment, and must never be initiated merely because this code was merged.

## Exact scheduled maintenance windows — 4.7.5 candidate (not deployed)

The owner rejected generic “reopen after N minutes” presets. Control → Operations → Maintenance now has TWO explicit endpoints, each independently selected:

- **Starts:** date, local clock time, IANA time zone (for example, `2026-11-10 22:00 Europe/London`).
- **Ends:** date, local clock time, IANA time zone (for example, `2026-11-11 06:00 America/New_York`).

The server converts each local time into an absolute UTC millisecond timestamp using current IANA zone rules. Spring-forward nonexistent local times and autumn repeated clock times are rejected with actionable errors; dates, zones, and end-before-start are validated. It does not silently choose a daylight-saving offset. The start must be at least 30 seconds in the future and within one year; the end must be at least one minute later and no more than 30 days after start.

The authenticated owner confirms the exact start and end and receives a persistent status in Control. The owner can cancel a pending window. The server persists its reason, both chosen zone names, UTC instants and lifecycle state in private `public-access.json`; no laptop, phone, background browser timer, or Git branch is needed to trigger the transitions.

### Safe lifecycle

1. Before the start: Game Room remains open. A pending schedule never blocks gameplay early.
2. At the chosen start: Oracle checks the authoritative count for **all existing games and lobbies**. If zero, it activates the existing public 503/Socket.IO gate; HGR Control remains reachable.
3. If rooms exist or the registry is unavailable, state becomes **Waiting for rooms** and is checked again. Existing matches are never forcibly ended. Once rooms become empty, closure begins for the **remaining** portion of the window.
4. If the rooms are not empty before the exact scheduled end, the window is **missed** and the website stays open. The window is **never extended** to compensate for the delay.
5. At the exact end, Oracle reopens the public visitor gate, persists **Completed** and clears the deadline. If server persistence fails, it retries. On server restart the window is recovered and reconciled against the current clock **after** saved game rooms have been restored.
6. Owner can manually cancel a pending schedule; attempting an immediate Close without canceling is refused so a saved schedule cannot silently disappear. During an active window, the owner may explicitly Reopen, which clears the window.

Control displays both time-zone-specific endpoints and the current window status. While closed, the visitor page displays the end in the owner's selected end time zone with an unambiguous underlying ISO timestamp. Immediate manual Close/Reopen are separate operations and do not use duration presets. Older saved duration-based closures are read for safe migration but the generic duration selector is not offered.

Security remains owner-only, session-authenticated, same-origin, JSON, and explicit confirmation. No scheduled software deployment or automatic release is included. A code merge does **not** create or activate a live maintenance window. Tests: `npm run test:public:maintenance`, `npm run test:browser:public-maintenance`, `npm run test:browser:control:priorities` and release CI.
