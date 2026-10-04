# HGR Control Cloud Foundation

HGR Control now has one administrative UI that can be reached in two ways:

1. **Private owner route** — the existing Tailscale-backed Control PWA.
2. **Cloud relay route** — HGR Control hosted on the HGR website, with the owner PC connecting outward to the relay.

The cloud design does **not** turn HGR Control into a remote shell.

## Security boundary

The **Owner PC Control Agent** remains the executor. The cloud relay is constrained to the fixed HGR Control action family already approved by the local agent:

- Status
- Start HGR
- Restart HGR
- Close HGR
- Update HGR
- Logs

4.5.4.5 deliberately enables only **Update HGR** through the cloud route. Start, Restart and Close remain disabled in Cloud Control until their own audited batches.

There is no free-form process, executable, shell, argument or path field in the cloud protocol. Cloud Update queues one fixed `update` action; the outbound PC bridge then asks the existing loopback Control Agent for its normal one-time Update confirmation and calls the existing `/api/actions/update` endpoint. The cloud service never executes Windows commands itself.

The PC agent uses an **outbound authenticated channel** to the cloud, implemented as bounded HTTPS heartbeat/poll/progress requests with a registered device credential. The owner machine does not expose an administrative Windows port to the public internet.

## Protocol foundation

The shared contract is defined in:

`shared/platform/control-cloud.ts`

Protocol identifier:

`hgr-control-cloud-v1`

Every request carries:

- request ID;
- registered HGR owner-device ID;
- one allow-listed action;
- timestamp;
- optional server-issued confirmation ID for actions that require confirmation.

Results carry the same request/device/action identity plus operation state and a bounded reason string.

## Connection flow

```text
Phone / browser HGR Control
              |
              | HTTPS + authenticated owner/admin session
              v
       HGR cloud relay
              ^
              | outbound HTTPS heartbeat/poll/progress
              | registered device credential
              |
       Owner PC cloud bridge
              |
              | bearer-authenticated loopback only
              v
     HGR Control Agent :43127
              |
              | fixed Update confirmation + action
              v
     approved HGR updater
```

The existing local bridges remain the final execution boundary. The cloud relay never receives arbitrary Windows instructions.

## Device registration

The outbound owner-PC bridge creates a persistent random device ID and credential under ignored local runtime state. The cloud stores only the credential hash.

A new device first appears as **pending**. An already authenticated HGR owner or administrator must explicitly approve it in Cloud Control before it can poll for Update work. Approval is not inferred merely from knowing the website address or opening a connection.

The cloud status surface reports:

- pending / approved state;
- owner-PC online/offline state;
- local Control Agent availability;
- machine name;
- HGR version and last-seen time.

The local PC must remain powered on and HGR Control must be running for cloud Update to execute.

## Confirmation model

Update keeps two confirmation boundaries:

1. the Cloud Control browser obtains a short-lived, actor/device-bound one-time confirmation before queueing Update;
2. the owner-PC bridge obtains the existing short-lived local Control confirmation before calling the fixed local Update action.

Both confirmations are single-use. A stale, wrong-device or wrong-account cloud confirmation is rejected.

## Update execution and progress

The owner PC runs the same approved updater used by normal HGR Control. The bridge does not duplicate Git, build or deployment logic.

`control-update.ps1` writes a bounded runtime result marker so the independent outbound bridge can report a final succeeded/failed result even when the local Control Agent is intentionally restarted by the updater. While the local agent is present, its existing progress phases are forwarded to Cloud Control. Cloud state is persisted under the normal HGR production data root so an Oracle service restart does not erase the operation record.

The Cloud Control Operations panel enables only **Update HGR** when an approved owner PC and its local Control Agent are both online. The existing persistent operation toast displays update phase/progress on desktop and mobile.

## Audit and state

Both sides keep auditable event identity:

- request ID;
- device ID;
- action;
- start/result timestamps;
- final state;
- bounded failure reason.

No bearer credential or device secret is written into the public operation status or audit response.

## Delivery stages

### Stage 1 — complete

- shared allow-listed cloud protocol contract;
- cloud/control architecture documented;
- local Tailscale Control remains the verified fallback.

### Stage 2 — 4.5.4.5 complete in source

- persistent owner-PC device enrollment identity;
- explicit pending → approved owner/admin enrollment;
- outbound-only owner-PC heartbeat/poll/progress channel;
- cloud device presence/status;
- fixed Update request queue;
- cloud + local one-time Update confirmations;
- existing approved owner-PC updater remains the executor;
- persistent operation progress/final-state handoff;
- Cloud Control Update button enabled only when the approved PC is actually reachable.

Real owner-PC/phone acceptance remains required after deployment. Source/CI completion does not prove the owner's Windows bridge is online or that a real remote update completed.

### Later audited stages

- explicit enrollment revocation UI;
- Start and Restart;
- confirmed Close;
- richer telemetry, cancellation/stall handling and recovery UX.

The private Tailscale route remains available as the recovery/fallback path while cloud capabilities are introduced incrementally.
