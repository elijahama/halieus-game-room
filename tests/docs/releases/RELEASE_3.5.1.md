# Halieus Game Room 3.5.1

Production-host cleanup and polish patch.

- normal Windows launcher opens the Oracle-hosted `halieus.remotewire.net` service instead of starting localhost;
- laptop start/restart/stop controls are separated under `dev-tools/Local Development`;
- packaged Electron target and Oracle deployment templates use the real Dynu hostname;
- general Open Graph/Twitter link-preview metadata and canonical URL added;
- Halieus H icon seam artifact removed and PNG/ICO/PWA variants regenerated;
- normal Oracle updates no longer require or upload laptop `server/data`;
- generated dependency/build/runtime trees and stale nested application copies removed from the source package;
- Oracle deployment prunes build-only dependencies after compilation.

HTTPS/TLS is an infrastructure activation step on the live Oracle VM and follows this source patch.
