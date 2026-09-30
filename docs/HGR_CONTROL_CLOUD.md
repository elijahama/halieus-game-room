# HGR Control Cloud Foundation

HGR Control is moving toward one UI that can be reached in two ways:

1. **Private owner route** — the existing Tailscale-backed Control PWA.
2. **Cloud relay route** — the same owner UI hosted by HGR, with the owner PC connecting outward to the relay.

The cloud design does **not** turn HGR Control into a remote shell.

## Security boundary

The owner PC remains the executor. The cloud relay can request only the fixed HGR Control actions already approved by the local agent:

- Status
- Start HGR
- Restart HGR
- Close HGR
- Update HGR
- Logs

There is no free-form process, executable, shell, argument or path field in the cloud protocol.

The PC agent opens the connection **outbound** to the cloud. The owner machine does not expose an administrative Windows port to the public internet.

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

## Planned connection flow

```text
Phone / installed HGR Control PWA
              |
              | HTTPS + authenticated owner session
              v
       HGR cloud relay
              ^
              | outbound authenticated channel
              |
       Owner PC Control Agent
              |
              v
     fixed local HGR bridges
```

The existing local bridges remain the final execution boundary. The cloud relay never receives arbitrary Windows instructions.

## Device registration

Cloud mode will require explicit owner-device registration. Registration credentials must live in ignored runtime state or deployment environment configuration, never in Git.

A registered PC should be independently revocable without changing the HGR account password.

## Confirmation model

Close and Update retain the confirmation model already used by local/mobile Control.

The cloud service may issue a short-lived confirmation identifier, but the owner PC agent still validates the action against its local allow-list before execution.

## Audit

Both sides keep auditable event identity:

- request ID;
- device ID;
- action;
- start/result timestamps;
- final state;
- bounded failure reason.

No bearer credential is written into the audit trail.

## Delivery stages

### Stage 1 — complete

- shared allow-listed cloud protocol contract;
- cloud/control architecture documented;
- local Tailscale Control remains the verified fallback.

### Stage 2

- owner PC outbound relay client;
- cloud device presence/status endpoint;
- explicit owner-device registration and revocation.

### Stage 3

- host the HGR Control PWA on the HGR cloud origin;
- route Status and Logs through the relay first;
- real-device owner QA.

### Stage 4

- Start and Restart;
- confirmed Close and Update;
- operation progress and complete audit parity with private Control.

The private Tailscale route remains available even after cloud Control is enabled.
