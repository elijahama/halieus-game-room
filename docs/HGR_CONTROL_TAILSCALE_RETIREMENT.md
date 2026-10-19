# HGR Control — Retirement of the Tailscale Client (4.5.5d, 19 October 2026)

**Owner decision:** Stop using the old private Tailscale/MagicDNS phone client for HGR Control. The authoritative website interface is **https://halieus.remotewire.net/control/**. Remove the former Control Tailscale dependency without deleting authenticated Control actions, losing Cloud Update, touching approved canonical HGR launcher artwork or removing unrelated host/Oracle infrastructure.

## Current architecture
- Browser Control is served by Oracle over public HTTPS and authorizes the owner/admin through HGR's existing Cloud Control system.
- The owner PC runs `server/src/control-agent.ts` listening **only on 127.0.0.1:43127**, with a random 256-bit temporary bearer token stored only in ignored `server/data/runtime/.hgr-control-token`.
- A separate outbound-only `server/src/control-cloud-agent.ts` authenticates with the website Cloud relay and reads the current local token before each loopback action. No inbound PC port, private Tailscale Serve route, tailnet sign-in or QR pairing is necessary.

## Source migration, 4.5.5d
- `scripts/windows/start-control.ps1` is now a **Cloud-only local background agent bootstrap**. It verifies the existing listener PID, never takes over an unrelated process, validates local `/api/ping`, writes a schema-2 lifecycle file with `httpsPort=0` and the canonical website Control URL, generates fresh random token, and launches the agent in the background. Old `-HttpsPort` argument is accepted but is inert for backward-compatible signed CMD launchers.
- `Start HGR Control.cmd` continues to start the local Control Agent *and* the outbound Cloud bridge; old `Start HGR Control Mobile.cmd` and the matching PowerShell alias now use this same Cloud bootstrap, with no private pairing flow.
- `scripts/windows/stop-control.ps1` retains the existing authenticated shutdown, PID verification, token deletion and state cleanup. **Only when stopping a legacy schema-1 state** does it attempt to decommission the old Serve port via a previously installed Tailscale executable. Schema-2 local-only Control startup and stop have **no Tailscale dependency**.
- `scripts/windows/refresh-control-after-update.ps1` continues the exact guarded snapshot/stop/restart/fresh-token check and outbound Cloud bridge handoff but no longer restarts a private HTTPS Serve listener. Its obsolete fallback message is changed.
- The preexisting private Control UI and historical Tailscale documentation are **archival**, not the current access path. Their presence in source/old tests does not indicate a live private client. Do not remove unrelated Oracle private SSH access or uninstall a user-owned third-party Tailscale application without a separate explicit request.

## Migration / acceptance gates
1. Source and PowerShell parser checks: no Tailscale invocation in new start path; agent remains loopback-only and uses fresh bearer token, signed updater still preserves lifecycle.
2. Do not terminate or rotate a running Control Agent while an active owner update operation is in progress. The new start helper refuses to replace legacy-live state invisibly.
3. For an owner-requested live migration, verify the current local API has no active operation, preserve Cloud bridge identity, stop the **PID-verified old Control Agent** and retire only its matching private Serve port, start new schema-2 agent and existing outbound bridge, and confirm `/api/ping`, authenticated `/api/status`, fingerprint, cloud website availability and no local port exposed off loopback.
4. Run the full HGR regression suite and local production build; publish the source and record commit/deployment receipts separately. Do not claim Oracle website deployed if only Windows Control startup scripts were updated.

**Scope limit:** This is the owner Control client removal, *not* a change to local legacy Tailscale Funnel scripts for historical public testing, unrelated Tailscale SSH/admin installations, game server sockets, account security, or tournament rules. The approved six desktop launchers remain Start, Restart, Close, Update, PowerShell and OpenShard.
