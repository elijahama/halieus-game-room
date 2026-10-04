# HGR 4.5.4.5 — Cloud Update

Scope: enable **Update HGR** from the HGR Control page on the public HGR website while keeping the owner PC as the trusted executor.

## Implemented

- The owner PC runs a separate outbound-only Cloud bridge alongside the existing private/Tailscale Control Agent.
- First contact creates a pending device enrollment; an authenticated HGR owner/admin must approve it once in Cloud Control.
- The public relay stores only a hash of the device credential.
- Cloud Control reports owner-PC presence and local Control-Agent availability.
- Only the existing **Update HGR** operation is enabled in this sub-version. Start, Restart and Close remain disabled.
- Update requires a short-lived one-time cloud confirmation tied to the signed-in actor and owner-PC device.
- The outbound bridge then obtains the existing one-time local Update confirmation and calls the existing fixed local `/api/actions/update` endpoint.
- No arbitrary shell command, executable path, argument list or user-supplied process data crosses the cloud protocol.
- The same approved Windows updater performs Git sync, release preparation, validation, build, regressions, Oracle preflight/deployment and client refresh.
- Update progress is reflected through the existing HGR Control operation toast.
- `control-update.ps1` writes a runtime completion marker so final success/failure can still be reported when the local Control Agent restarts during a successful update.
- Cloud relay state lives under the normal durable HGR data root in production.
- The existing Tailscale route remains available as a fallback.

## Bootstrap / real-device acceptance

The cloud relay becomes active on Oracle after this batch is deployed once through the existing updater. On the owner PC, run the normal **HGR - Control** launcher once after receiving this batch so the new outbound bridge starts and creates its persistent device identity.

Then:

1. Open HGR Control on the website while signed in as owner/admin.
2. Approve the pending owner PC once.
3. Confirm it shows Online and the local Control Agent is available.
4. Press **Update HGR** from a phone/browser away from the PC.
5. Confirm the owner PC performs the normal updater, progress remains visible, the site returns after deployment, and the final operation state is correct.

The laptop/owner PC must be powered on and HGR Control must be running. The cloud is the authenticated relay/control surface; it is not the Windows executor.

## Explicitly not in this batch

- Start / Restart / Close through cloud Control;
- arbitrary remote shell/process execution;
- CPU/RAM/network/storage telemetry;
- cancellation/stall recovery;
- Tailscale removal;
- unrelated Control layout redesign;
- main-page featured-game rail visual cleanup (tracked for 4.5.4.6).
