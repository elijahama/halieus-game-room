# Halieus Game Room 3.5.16 — Oracle Credential Discovery

3.5.16 fixes the website updater's incorrect assumption that the Oracle private key had one exact filename (`%USERPROFILE%\.ssh\halieus-oracle.key`).

## Changes

- Root website updater now tries normal OpenSSH authentication first, including ssh-agent, `~/.ssh/config`, and standard identity names.
- If that does not authenticate, it safely scans `~/.ssh` for private-key files and tests them against the Halieus Oracle host in non-interactive mode.
- A key found under a different filename can therefore be used without renaming or copying it.
- An explicit `-KeyPath` and `HALIEUS_ORACLE_KEY` remain supported for keys stored elsewhere.
- The deploy script supports default OpenSSH/agent authentication without forcing `-i`.
- If no credential exists on the PC, the updater now explains that the private key is intentionally absent from shareable release ZIPs instead of pretending a specific missing filename is required.

No production account/game data or Oracle TLS configuration is changed by this patch.
