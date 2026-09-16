# RC 3.3.13 Launcher Polish

## User-facing launchers

The Windows host controls are now presented as:

- **Mega Monopoly** — starts the game server, checks Tailscale Funnel, waits for the site, then opens the public game URL.
- **Close Monopoly** — stops the detached Mega Monopoly background server.

The underlying command files are named `Mega Monopoly.cmd` and `Close Monopoly.cmd`.

## Browser favicon as the Windows launcher icon

`Mega Monopoly.ico` is copied from the browser favicon and is used for both Windows shortcut icons.

On launch, `launcher-shortcuts.ps1` creates or refreshes:

- `Mega Monopoly.lnk`
- `Close Monopoly.lnk`

The shortcuts use the favicon, point at the command scripts in the current extracted folder, and use that folder as their working directory. This means the ZIP can be extracted anywhere without hard-coded paths.

After the shortcuts are created, the underlying `.cmd` files are marked hidden so normal File Explorer views show the two polished icon launchers instead of duplicate command files.

## Background process behavior

This change does not alter the RC 3.3.12 detached-server behavior. Closing the launcher window does not stop the Node server. `Close Monopoly` stops the stored server PID, with the existing port-3000 fallback retained.
