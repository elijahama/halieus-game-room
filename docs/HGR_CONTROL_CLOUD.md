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

4.5.4.7 adds the matching negative control: an owner/admin can explicitly reject a pending enrollment or revoke an approved enrollment. Revocation permanently marks that credential as `revoked`; heartbeat, polling and progress requests from it are rejected, it no longer presents as online, and outstanding one-time Update confirmations tied to it are invalidated. Revocation is refused while that device has a queued or running Control operation so the relay cannot orphan an in-flight Update. A revoked credential is not silently restored or re-approved in place; a **fresh owner-PC enrollment** is required before cloud operations can be used from that machine again.

The cloud status surface reports:

- pending / approved / revoked state;
- owner-PC online/offline state;
- local Control Agent availability;
- machine name;
- HGR version and last-seen time.

The local PC must remain powered on and HGR Control must be running for cloud Update to execute.

## Confirmation model

Update keeps two confirmation boundaries:

1. the Cloud Control browser obtains a short-lived, actor/device-bound one-time confirmation before queueing Update;
2. the owner-PC bridge obtains the existing short-lived local Control confirmation before calling the fixed local Update action.

Both confirmations are single-use. A stale, wrong-device or wrong-account cloud confirmation is rejected. Revoking an enrollment also invalidates any still-pending cloud confirmation for that device.

## Update execution and progress

The owner PC runs the same approved updater used by normal HGR Control. The bridge does not duplicate Git, build or deployment logic.

`control-update.ps1` writes a bounded runtime result marker so the independent outbound bridge can report a final succeeded/failed result even when the local Control Agent is intentionally restarted by the updater. While the local agent is present, its existing progress phases are forwarded to Cloud Control. Cloud state is persisted under the normal HGR production data root so an Oracle service restart does not erase the operation record.

4.5.4.8 fixes the real-device 88% handoff failure. A cloud-triggered update no longer lets the updater stop the Control Agent process that owns the update wrapper. Instead, the in-process Control restart is deferred until the update/deploy core and client handoff have returned successfully. `control-update.ps1` then launches an independent `control-update-finalize.ps1` process. That finalizer performs the verified Control restart with fresh credentials and is the only process allowed to write the final `succeeded` result marker. If the restart fails it writes a terminal `failed` marker instead, so Cloud Control cannot remain indefinitely at 88% waiting for a parent process that was intentionally stopped.

A later normal/local update can also reconcile an older orphaned `running` result marker after a successful Control refresh. That old cloud operation is marked failed/retryable rather than silently reported as success. This is the recovery path for the first real-device 88% failure observed before 4.5.4.8.

The Cloud Control Operations panel enables only **Update HGR** when an approved owner PC and its local Control Agent are both online. The existing persistent operation toast displays update phase/progress on desktop and mobile.

## Audit and state

Both sides keep auditable event identity:

- request ID;
- device ID;
- action;
- start/result timestamps;
- final state;
- bounded failure reason.

4.5.4.9 makes the already-persisted Control operation diagnostics visible to authenticated owner/admin users. The expanded operation card now shows the phase, cloud request ID, local operation ID when present, and the bounded failure reason. The Audit screen keeps the existing account/platform administration history and adds a separate **Control operations** history sourced from the cloud request store. That history is a sanitized projection only: it does not expose the device credential, credential hash, bearer token, shell command, path or arbitrary local log content.

Enrollment records also retain their approval/revocation state and timestamps. No bearer credential or device secret is written into the public operation status or audit response.

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

### Stage 3 — 4.5.4.7 complete in source

- explicit pending-enrollment rejection;
- explicit approved-enrollment revocation UI;
- revoked credential rejection at heartbeat/poll/progress boundaries;
- invalidation of outstanding Update confirmations;
- active-operation guard so revocation cannot orphan a queued/running Update;
- persistent revoked state in Cloud Control until a fresh owner-PC enrollment is created and approved.

Real-device revocation acceptance remains required after deployment.

### Stage 4 — 4.5.4.8 final-handoff repair

- reproduce the real Cloud Update failure at 88% during owner-Control restart;
- defer that restart while the current Control Agent still owns the update wrapper;
- run the restart from an independent finalizer process;
- write 100% success only after the verified Control restart completes;
- persist a terminal failure if the final restart fails;
- allow a later successful local update to release an older orphaned 88% operation as failed/retryable rather than leaving it permanently running.

Real-device acceptance requires one fresh Cloud Update to progress through the final Control restart and reach **100% · Update complete** without returning to the laptop.

### Stage 5 — 4.5.4.9 Control operation diagnostics

- expose a read-only owner/admin operation-history endpoint from the persisted Control cloud request store;
- keep the existing administrative/account audit history intact;
- add a separate Control operations history with timestamp, phase, progress, final state and bounded reason;
- show cloud/local operation identifiers and failure reason in the expanded operation card;
- never expose enrollment secrets, credential hashes, bearer tokens, arbitrary command data or unrestricted local logs in the diagnostic surface.

Real-device acceptance is to reopen the failed 38% Update and confirm its actual failure reason is visible in both the expanded operation card and Audit → Control operations before another remote Update is attempted.

### Later audited stages

- Start and Restart;
- confirmed Close;
- richer telemetry, cancellation/stall handling and recovery UX;
- guided local identity reset/re-enrollment recovery.

The private Tailscale route remains available as the recovery/fallback path while cloud capabilities are introduced incrementally.
