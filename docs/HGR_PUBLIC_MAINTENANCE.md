# HGR 4.6.10 — Owner-controlled public Game Room maintenance

This is a **visitor access gate**, not a Windows launcher or a process shutdown. The normal HGR Start/Restart/Close shortcuts only manage the owner PC's dedicated Edge window. The public website remains independent.

## Operation

In Control → Operations, the authenticated owner sees a distinct Public Game Room access panel with a live-room count. Close Public Game Room requires typing the complete confirmation phrase and accepting a second confirmation. The server refuses closure while any live room exists (409). Reopen Public Game Room has its own owner confirmation and remains available through Control.

State is persisted outside the Git working tree in the existing private accounts data directory, in the file public-access.json. It stores only the open/closed flag, short visitor reason, timestamp and owner account ID. A corrupted existing state file fails closed for public visitors, while preserving authentication and owner Control for repair. No secret credentials, shell commands, key material or H artwork is introduced.

## Visitor behaviour and access recovery

The Oracle server keeps running. Visitor HTML navigation gets an uncached 503 page with the owner-approved maintenance message. Control, health, authenticated owner sign-in and account recovery routes continue working. The maintenance page contains an owner login form so an expired session cannot lock the owner out.

While closed, new public Socket.io game connections are rejected. The only accepted Control socket has an explicit Control flag AND an authenticated owner role. After a confirmed close, remaining public sockets are told the visitor gate is closed and disconnected. New attempts cannot create games while the gate is active. The public gate never invokes the owner-PC Close script.

A PWA navigation 503 must not overwrite the last healthy offline shell cache. A previously installed offline PWA cannot be centrally erased, so don't claim complete offline revocation.

## Security, UX, validation

- Default open; corrupt existing state fail-closed, owner recovery available.
- Owner-only GET and POST, JSON and same-origin checks, typed confirmation.
- Active-room rejection across all 14 games, with no forced close during active games.
- Separate public-site card from the owner-PC window controls, responsive mobile layout.
- No automatic or unconfirmed production closure, no Oracle restart, no PWA permission changes.
- Test persistence, escaped HTML, Control login, public socket gate, live room protection, service-worker cache policy, narrow mobile layout, all regressions and release identity.

An actual production closure is a **separate explicit owner operation** after deployment, and must never be initiated merely because this code was merged.
