# Halieus Game Room 3.5.19

3.5.19 fixes the Windows PowerShell 5.1 compatibility crash exposed while discovering the Oracle SSH key.

## Website updater

- Replaces `return @($list)` on .NET generic lists with `.ToArray()` before returning from key-search helpers.
- Prevents the `Argument types do not match` failure seen at `update-website.ps1:98` on Windows PowerShell 5.1.
- Keeps automatic key discovery, the explicit file picker, saved key-path memory, and normal OpenSSH/ssh-agent authentication.
- The owner `.ssh` directory is optional; the updater also searches nearby Halieus project folders.
- Private SSH keys remain excluded from release ZIPs.
