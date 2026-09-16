# Halieus Game Room 3.5.2

## Reload and theme continuity

- Applies the saved light/dark palette before the client bundle paints.
- Makes the brief account-status bridge use the active palette and a deliberate Halieus H boot beat.
- Removes full-screen opacity from page-entry motion so hard reloads do not expose the document canvas as a flash.
- Synchronises the document background, application surfaces, text, borders and shadows to one 820 ms theme transition.

## Production security and deployment

- Production launchers are HTTPS-only for `https://halieus.remotewire.net`.
- Normal Oracle updates can package deployment source directly from the one owner workspace; no separate Clean Source ZIP is required.
- Laptop runtime data is excluded from routine deployment packaging.
- Existing Certbot-managed HTTPS Nginx configuration is preserved and the old `play.halieus.net.conf` filename is migrated in place when encountered.

## Validation

Client TypeScript passed. Server build passed. The complete historical regression/integration chain through 3.5.1 plus the dedicated 3.5.2 regression passed in an isolated test copy.
