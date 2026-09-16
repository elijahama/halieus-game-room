# Oracle production deployment — Halieus Game Room

Oracle is the authoritative production host. The laptop and Tailscale are not in the public serving path.

1. Create a dedicated `halieus` service account.
2. Install clean source/dependencies under `/opt/halieus-game-room` on Oracle (`npm ci` on Oracle; never copy Windows `node_modules`).
3. Build the client and server on Oracle with `npm run build`.
4. Create `/var/lib/halieus-game-room` owned by the service account. This is the canonical data root and must be backed up independently of application deployments.
5. Copy `halieus.env.example` to `/etc/halieus-game-room/halieus.env`.
6. Install/enable `halieus-game-room.service`.
7. Put the Nginx reverse-proxy configuration in place and provision TLS for `halieus.remotewire.net`.
8. Migrate the one authoritative copy of existing account/session/Mega Board data into the canonical data root before opening production. Do not leave competing account databases on laptop and Oracle.
9. Validate `/health`, account login, room creation/join, then perform the laptop-off acceptance test.

Tailscale may still be installed on Oracle for private SSH/admin access. It is deliberately not required for public players.
