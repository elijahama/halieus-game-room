# Halieus Game Room desktop client — 3.5.2

The Windows client is a secure Electron shell for `https://halieus.remotewire.net`. It does not run a second game server. Browser, phone, and desktop users share the same Halieus accounts, rooms, and multiplayer service.

## Stable Windows identity
- Folder: `Halieus Game Room`
- Executable: `Halieus Game Room.exe`
- Installer: `Halieus Game Room Setup.exe`
- Public version is stored in metadata/About diagnostics, not the installed folder name.

## Development
`npm --prefix desktop install`
`HALIEUS_DESKTOP_DEV_URL=http://localhost:3000 npm run desktop:dev` (PowerShell syntax differs).
Packaged builds ignore the developer URL and always use production.

## Windows packaging
Run on Windows:
- `npm run desktop:package:win` for the NSIS installer.
- `npm run desktop:package:portable` for the portable Steam/non-Steam executable.

The actual Windows installer must be built and smoke-tested on Windows before 3.5.2 is classified as validated.
