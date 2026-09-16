# Halieus Game Room 3.5.17

## Website updater / launcher safety hotfix

- Release archives no longer include pre-generated `.lnk` files. Windows shortcuts can embed an absolute path and were capable of launching an older extracted Halieus build.
- Added `FIRST RUN - Refresh Halieus Launchers.cmd` to generate fresh shortcuts on the destination PC.
- Website updater now prints the release version and exact folder it is running from before any SSH/deploy action.
- Release archive uses a versioned top-level folder (`Halieus Game Room 3.5.17`) to prevent accidental in-place merging with an older build.
- Retains 3.5.16 Oracle credential discovery: OpenSSH agent/config first, then usable private-key candidates in the owner's `.ssh` directory.
