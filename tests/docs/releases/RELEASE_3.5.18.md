# Halieus Game Room 3.5.18

3.5.18 fixes the remaining Oracle update blocker exposed by 3.5.17: the owner PC has no working credential in the normal `.ssh` locations, so the updater could identify the correct release but still could not authenticate to Oracle.

## Website updater

- Keeps normal Windows OpenSSH/ssh-agent/config authentication first.
- Remembers the *path only* of a previously proven Oracle private key in `%LOCALAPPDATA%\Halieus Game Room\owner-update.json`; it never copies the private key.
- Searches likely OpenSSH/PEM private keys in `.ssh`, Downloads, Desktop, Documents, OneDrive and nearby Halieus/project folders instead of only `.ssh`.
- Uses a bounded search and tests candidate keys directly against the Halieus Oracle host before selecting one.
- Explicit `Update Halieus Website` runs open a Windows file picker if automatic discovery cannot find the key, so the owner can select an existing key wherever it lives.
- Detects PuTTY `.ppk` files and explains that the OpenSSH deployment path cannot use them directly.
- If the private key is genuinely gone, the error now clearly distinguishes that from an updater bug and points to Oracle Cloud access recovery.

The private key is still intentionally excluded from release ZIPs.
