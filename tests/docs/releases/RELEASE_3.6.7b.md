# Halieus Game Room 3.6.7b

Minor deployment hotfix on top of 3.6.7a.

- Oracle website deployment no longer treats the root `Halieus Game Room.ico` Windows launcher asset as production-critical.
- The downloadable release continues to ship the icon for local shortcuts and desktop use.
- If the extracted Windows workspace is missing that one desktop-only icon, the updater now warns and continues packaging the website source.
- The root launcher icon is no longer an Oracle release-fingerprint input, preventing the remote integrity check from failing for a file the website never uses.
- No game logic, protected Ludo/Poker presentation, or 3.6.7 gameplay modules changed.
