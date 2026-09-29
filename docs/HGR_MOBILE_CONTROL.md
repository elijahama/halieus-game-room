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

Open a second PowerShell. It does **not** need to start in the HGR folder.

The agent window prints the exact absolute client commands for your repository location. The stable root client is:

```text
HGR-Control.cmd
```

If the second PowerShell is already in the HGR repository, use:

```powershell
.\HGR-Control.cmd status
```

Restart HGR with:

```powershell
.\HGR-Control.cmd restart
```

Read recent audit entries with:

```powershell
.\HGR-Control.cmd logs | ConvertTo-Json -Depth 6
```

If the second PowerShell opens somewhere else, copy the **absolute command printed by the running Control Agent**. It uses PowerShell's call operator (`&`) and therefore works even though the HGR path contains spaces.

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

**Real-machine verification:** authenticated Restart was successfully executed on the owner Windows PC through the local HGR Control client, fixed API endpoint, operation lock and PowerShell restart bridge. The dedicated HGR app restarted successfully and the Control Agent remained available.
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

## Implementation notes and troubleshooting history

This section records real issues encountered while building HGR Control so future changes do not repeat the same mistakes.

### Repository root detection

**Observed failure:** the first Control Agent reported an HGR version such as `0.22.9-rc.3.3.28` and printed the project root as `...\Halieus Game Room\server`.

**Cause:** the workspace command runs from the `server/` package, and the initial root search accepted the first directory containing a `VERSION` file. `server/VERSION` is not the authoritative HGR product version.

**Fix:** a repository root is now accepted only when it contains the canonical root package plus `client/`, `server/`, `shared/` and the root `VERSION`.

**Lesson:** shared filenames are not enough to establish authority. Validate the identity of the owning repository/workspace.

### Clean Git state

**Observed failure:** a clean repository appeared as `dirty=` instead of `dirty=False`.

**Cause:** empty successful output from `git status --porcelain` was collapsed into `null`, making “clean” indistinguishable from “Git inspection failed”.

**Fix:** empty output is preserved as a successful value.

**Status semantics:**

- clean → `false`
- changed → `true`
- Git unavailable → `null`

### Token generation

**Observed failures:** PowerShell/.NET combinations on the owner machine did not consistently expose the same `RandomNumberGenerator` overloads.

**Fix:** cryptographic token generation moved to Node's `node:crypto`, which is already an HGR dependency.

**Lesson:** when a project already owns a runtime, prefer one predictable crypto/runtime path over shell-version-specific APIs.

### Token handoff

**Observed failure:** using the clipboard for the temporary bearer token was fragile because copying the next command replaced the token before the second shell read it.

**Fix:** the authenticated local launcher writes the token to the ignored runtime directory and the allow-listed client helper reads it directly. The token is removed when the agent exits.

**Lesson:** secrets should not depend on a human copy/paste sequence when a local ephemeral file can safely bridge two trusted local processes.

### PowerShell paths with spaces

**Observed failure:** `.\Start HGR Control.cmd` was parsed as `.\Start` because the launcher filename contains spaces.

**Fix:** `Start-HGR-Control.cmd` is the PowerShell-safe alias. The spaced launcher remains for Explorer/shortcut compatibility.

### Client shell working directory

**Observed failure:** the second PowerShell opened in `C:\Users\...`, so a relative path such as `.\scripts\windows\hgr-control-client.ps1` could not be found.

**Fix:** `HGR-Control.cmd` is the stable root client entrypoint, and the running agent prints absolute commands that work from any directory.

**Lesson:** operator tooling should not assume the shell starts in the repository root.

### Restart execution bridge

**Observed failure:** authentication and the `POST /api/actions/restart` endpoint succeeded, but the restart action itself failed when Node invoked a spaced `.cmd` path through `cmd.exe /c`.

**Fix:** HGR Control now invokes a fixed PowerShell bridge:

```text
scripts/windows/control-restart.ps1
```

The bridge resolves and runs only the canonical `Restart Halieus Game Room.cmd`. The API still never accepts a command path or shell string from the client.

**Lesson:** keep the remote API allow-listed, and isolate Windows shell/quoting details inside a fixed local adapter.

### Regression philosophy for Control

Each bug above resulted in a regression or contract check. HGR Control regressions should protect:

- repository-root authority;
- status semantics;
- fixed action IDs;
- no arbitrary shell input;
- token/authentication requirements;
- single-operation locking;
- audit logging;
- stable launcher/client entrypoints;
- documented operator workflow;
- fixed Windows action bridges.

