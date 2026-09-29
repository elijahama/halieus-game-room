# HGR Mobile Control

## Purpose

HGR Mobile Control turns the existing Windows launcher ecosystem into a secure phone-accessible control plane.

The goal is not “remote command prompt from a phone.” The goal is:

> **A small, auditable set of HGR actions that can be requested from a phone and executed safely by the owner PC.**

The phone interface will eventually be installable as a PWA.

## Architecture

```text
HGR Control PWA (phone)
        |
        | HTTPS/private network + bearer/session auth
        v
HGR Control Agent (owner PC)
        |
        +-- read status
        +-- start HGR
        +-- restart HGR
        +-- close HGR
        +-- run Update HGR GitHub.cmd
        +-- expose recent operation logs
        |
        +-- never accepts arbitrary shell text
```

The production game server and the owner-PC control agent are separate responsibilities.

The public HGR game server validates gameplay. The HGR Control Agent operates local owner tooling.

## Why the agent is separate

Putting Windows process controls into the normal public game server would mix two trust boundaries:

- player/game traffic;
- owner machine administration.

The control agent therefore runs as a separate entrypoint and should normally be reachable only over a private path such as Tailscale.

## Shared action contract

The canonical action IDs live in:

`shared/platform/control.ts`

Current planned actions are:

| Action | Purpose | Confirmation |
| --- | --- | --- |
| status | read agent/version/repository state | none |
| start | start/open HGR locally | none |
| restart | troubleshooting restart only | none |
| close | close the local HGR app | yes |
| update | full update/validation/deploy/restart path | yes |
| logs | read recent operation output | none |
| open-site | open HGR on the controller device | none |
| open-github | open the repository on the controller device | none |

The action ID is the input. The phone never supplies an executable path or command line.

## Foundation implementation

The first agent entrypoint is:

`server/src/control-agent.ts`

Run it during development with:

```powershell
npm run control:dev
```

The initial endpoint is:

```http
GET /api/status
```

Default address:

```text
http://127.0.0.1:43127/api/status
```

The foundation began read-only. Stage 2 now enables the first mutable action — **Restart HGR** — but only when `HGR_CONTROL_TOKEN` is configured and supplied as a bearer token. Start, Close and Update remain disabled.

Example response shape:

```json
{
  "ok": true,
  "agent": "online",
  "hgrVersion": "4.5.3",
  "machine": {
    "name": "OWNER-PC",
    "platform": "win32"
  },
  "repository": {
    "branch": "main",
    "commit": "abc1234",
    "dirty": false
  },
  "actions": [
    {
      "id": "status",
      "label": "Status",
      "kind": "read",
      "confirmation": "none",
      "implemented": true
    }
  ],
  "timestamp": "2026-09-29T00:00:00.000Z"
}
```

## Security rules

### 1. Loopback by default

Without configuration, the agent binds to `127.0.0.1`. That means only the PC itself can reach it.

### 2. No external bind without a token

If `HGR_CONTROL_HOST` is changed to a non-loopback address, the agent refuses to start unless `HGR_CONTROL_TOKEN` is also configured.

This is a guardrail, not the final security model.

### 3. No arbitrary shell

The control API must never accept fields such as:

```json
{ "command": "..." }
```

or:

```json
{ "exe": "...", "args": ["..."] }
```

The server maps a known action ID to a fixed implementation.

### 4. Private network

The intended remote path is Tailscale between the phone and owner PC. HGR Control should not require public router port forwarding.

### 5. Confirm sensitive actions

Close and Update are confirmation actions. Later versions should issue a short-lived confirmation token rather than relying only on a UI popup.

### 6. One mutable operation at a time

Start/Restart/Close/Update must be protected by an operation lock so two phone taps cannot run conflicting processes simultaneously.

### 7. Audit trail

Every process action should record:

- action ID;
- accepted/rejected;
- start time;
- finish time;
- exit status;
- safe output summary.

Secrets/tokens must never be written to the log.

## Learning walkthrough

This system is deliberately being built in stages so the project owner can implement/test alongside the AI-assisted work.

### Stage A — understand one GET endpoint

Start the agent:

```powershell
npm run control:dev
```

Then from the same PC:

```powershell
Invoke-RestMethod http://127.0.0.1:43127/api/status
```

What happens:

1. PowerShell makes an HTTP GET request.
2. Node receives the request.
3. The agent reads `VERSION`.
4. The agent uses read-only Git commands to inspect branch/commit/dirty state.
5. It creates a typed status object.
6. It serialises that object as JSON.
7. PowerShell converts the JSON response back into an object.

That request/response cycle is the basis of the phone controller.

### Stage B — authentication

For local development, HGR now owns the token handoff instead of asking you to copy a secret between shells manually.

Start the authenticated local agent from the repository root:

```powershell
.\Start-HGR-Control.cmd
```

Use the no-space launcher name in PowerShell so the command does not require quoting. The spaced `Start HGR Control.cmd` entrypoint remains available for Explorer/shortcut use.

That launcher runs:

```text
scripts/windows/start-control-agent.ps1
```

The helper:

1. generates a 32-byte cryptographic token with Node;
2. stores it temporarily in the ignored runtime directory;
3. sets `HGR_CONTROL_TOKEN` only for the Control Agent process;
4. starts `npm run control:dev`;
5. removes the temporary token when the agent exits.

The temporary file is:

```text
server/data/runtime/.hgr-control-token
```

`server/data/runtime/` is already excluded from Git.

The token is **not printed** and you do not need to copy it.

The HTTP authentication model is still:

```text
Authorization: Bearer <token>
```

The local helper simply handles that secret safely for you while we are developing the system.

We move the listener from loopback to the PC's Tailscale address only after local authenticated actions work.

### Stage C — first process action

Open a second PowerShell in the HGR repository. Use the allow-listed local client helper:

```powershell
.\scripts\windows\hgr-control-client.ps1 status
```

That reads the temporary local token and makes the authenticated status request.

Restart HGR with:

```powershell
.\scripts\windows\hgr-control-client.ps1 restart
```

Read recent audit entries with:

```powershell
.\scripts\windows\hgr-control-client.ps1 logs | ConvertTo-Json -Depth 6
```

The helper accepts only:

```text
status
restart
logs
```

It is not a general command runner.

The Restart path remains:

```text
restart
   ↓
authenticate
   ↓
check allow-list
   ↓
check operation lock
   ↓
run fixed Restart Halieus Game Room.cmd
   ↓
capture result
   ↓
write audit event
   ↓
return result
```

The request does not contain the path to the CMD file.

Only one mutable HGR Control action may run at a time. A second request while one is active receives a conflict response instead of launching another process.

The audit trail is written locally to:

```text
server/data/runtime/hgr-control-audit.ndjson
```

The audit records action ID, running/succeeded/failed/rejected state, timestamps and exit status. It does not log bearer tokens.

### Stage D — Update

Update uses the existing `Update HGR GitHub.cmd` contract. Its progress needs to be surfaced so the phone can distinguish:

```text
sync → validate → regressions → build → deploy → restart → complete
```

### Stage E — phone PWA

Only after the agent/authentication path works do we add the polished phone UI.

That prevents a nice-looking interface from hiding an unsafe backend.

## Environment variables

Foundation:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HGR_CONTROL_HOST` | `127.0.0.1` | listener address |
| `HGR_CONTROL_PORT` | `43127` | listener port |
| `HGR_CONTROL_TOKEN` | empty | bearer token; required for non-loopback binding |

A real token belongs in local environment configuration, never in Git.

## Roadmap

### Phase 1 — foundation
- [x] Masterbook
- [x] shared action contract
- [x] read-only local status endpoint
- [x] loopback-by-default safety
- [x] token required before non-loopback bind

### Phase 2 — safe local execution
- [x] bearer-token protection for mutable actions
- [x] timing-safe token comparison
- [x] one-operation-at-a-time lock
- [x] local audit log
- [ ] Start action
- [x] Restart action
- [ ] Close action
- [x] recent audit-log endpoint

### Phase 3 — update orchestration
- [ ] Update action
- [ ] structured progress events
- [ ] failed-stage reporting
- [ ] final automatic HGR restart

### Phase 4 — mobile PWA
- [ ] HGR Control screen
- [ ] status cards
- [ ] touch-first action buttons
- [ ] confirmations
- [ ] live operation progress
- [ ] Add to Home Screen support

### Phase 5 — private remote access
- [ ] Tailscale device setup
- [ ] bind agent to private Tailscale address
- [ ] configure mobile origin
- [ ] token/session provisioning
- [ ] revoke/rotate workflow

### Phase 6 — hardening
- [ ] rate limiting
- [ ] short-lived action confirmations
- [ ] automatic token rotation support
- [ ] recovery if an update/restart is interrupted
- [ ] security regression tests
