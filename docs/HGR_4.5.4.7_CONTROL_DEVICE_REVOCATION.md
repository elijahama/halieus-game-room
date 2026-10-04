# HGR 4.5.4.7 — Cloud Control device revocation

Scope is intentionally limited to the existing owner-PC Cloud Control enrollment boundary.

## Implemented

- Approved owner-PC Cloud Control enrollment can now be explicitly revoked from the authenticated HGR Control page.
- A pending owner-PC enrollment can also be explicitly rejected before approval.
- Revocation is available only to an authenticated HGR owner or administrator and remains protected by the existing same-origin POST boundary.
- Revocation changes the stored device approval state to `revoked`; the existing device credential is then rejected by heartbeat, polling and progress endpoints.
- Revoked devices no longer present as online or locally available in Cloud Control.
- Any outstanding one-time Cloud Update confirmation for that device is invalidated immediately.
- Revocation is refused while that device has a queued or running Control operation. This prevents a successful revocation from orphaning a currently executing Update operation and its final status handoff.
- Cloud Control shows a persistent revoked state instead of silently treating the device as merely offline.

## Security / recovery rule

A revoked credential is not silently restored and cannot be re-approved in place. A **fresh owner-PC enrollment** is required before Cloud Control can be used from that machine again.

This batch does not add a cloud shell, arbitrary executable/path/argument input, Start, Restart or Close. The owner PC remains the executor and the private Tailscale Control path remains the recovery fallback.

## Explicitly not in this batch

- Cloud Start HGR;
- Cloud Restart HGR;
- Cloud Close HGR;
- automated local identity reset/re-enrollment UI;
- CPU/RAM/network/storage telemetry;
- update cancellation, stall recovery or queue management;
- Tailscale removal.

## Real-device acceptance

After deployment, verify from an owner/admin browser session that:

1. a pending owner PC can be rejected;
2. an approved owner PC can be revoked while idle;
3. the revoked device immediately becomes unusable for Cloud Update and remains visibly revoked;
4. revocation is refused while an Update operation is still queued/running;
5. the existing private Control route remains available as fallback.
