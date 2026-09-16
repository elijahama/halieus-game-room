# Security Policy

Halieus Game Room is a private-first multiplayer project that is being prepared for public portfolio use.

## Do not commit

The repository must never contain:

- SSH/private keys or cloud credentials
- real `.env` secret values
- production account, player, session, invite or recovery data
- runtime databases or backups
- private deployment archives
- passwords, API tokens or authentication secrets
- machine-specific operator files that expose private infrastructure

## Repository vs production

GitHub stores the safe engineering history of the project. Oracle remains the production deployment target.

Repository documentation such as `README.md`, `SECURITY.md` and `.gitignore` is not automatically a production build dependency. Oracle deployment packaging should include only files required to install, build and run HGR.

## Reporting

If this repository becomes public and you discover a security issue, do not publish credentials, exploit details or private player information in a public issue. Contact the repository owner privately first.

## Development principle

HGR clients must not be trusted as the authority for multiplayer game outcomes. Game actions are validated by the server against the authoritative room/game state before accepted state is broadcast to connected clients.
