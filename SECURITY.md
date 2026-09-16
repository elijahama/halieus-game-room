# Security and public-source preparation

Report suspected vulnerabilities privately to the repository owner. Do not post recovery keys, invitation codes, cookies, account records or live-room snapshots in public issues. No public security contact is designated in this source package.

## Runtime boundary

Use HTTPS and the supplied reverse proxy. Node trusts one proxy hop; restrict direct access to the Node port. Keep HALIEUS_DATA_DIR outside the deployed source directory. Back up that directory separately and protect it as private account/game data. Recovery tokens are bearer credentials: possession can recover a seat. Guest room links are intentionally supported; the account portal is not a blanket authentication barrier over Socket.IO.

Account response routes send Cache-Control: no-store. Production client source maps are disabled. This does not make delivered JavaScript confidential. No secrets may be compiled into client assets.

## Before publishing on GitHub

This is an owner release package, not a sanitized public repository. The new .gitignore prevents common accidental additions but does not remove files already tracked or erase history. Build a fresh public staging directory; do not upload this ZIP wholesale.

Exclude owner-only documents, operational backups, local Windows shortcuts, deployment machine addresses/configuration, runtime accounts/sessions/feedback, bootstrap files, private keys, .env files, build outputs and archived release packages. Review scripts and documentation for identifying infrastructure details. Scan the complete staged tree and any Git history. Preserve the SCOWL dictionary copyright file. The project has no root license; the owner must choose publication/licensing terms before presenting it as open source.

Current audit findings and limitations are in docs/AUDIT_4.0.0.md. Deployment to the real Oracle host was not performed as part of this audit.
