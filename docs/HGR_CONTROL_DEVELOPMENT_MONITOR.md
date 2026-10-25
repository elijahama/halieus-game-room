# HGR Control — Development activity monitor

**Status:** Source-only, pending full CI, merge, deployment and owner-device acceptance. This is not a new HGR platform release. Current VERSION remains 4.5.6.

## Purpose

Control should let the owner see evidence of work submitted to GitHub without switching to the GitHub website. Existing Control Operations already handles real owner-PC Start, Restart, Close and Update operations, progress, timestamps and history. This new view is intentionally separate so build/development work cannot accidentally invoke maintenance controls.

## Delivered scope

- Desktop Control rail adds **Development**. Mobile retains the five-icon fixed bottom navigation; select **Ops → View development batches & GitHub checks** to reach the Development section without overcrowding the bottom bar.
- Read-only server endpoint: `GET /control/development-status` in `server/src/platform/control-cloud-ui-preload.ts`. Owner/admin session is mandatory; unauthenticated requests return HTTP 403.
- The server retrieves **public repository metadata only** from GitHub for `elijahama/halieus-game-room`: recent pull requests (draft, open, merged, closed) and GitHub Actions runs (queued, in progress, completed, actual outcome).
- Hard-coded repo paths, no client-supplied upstream URL, no arbitrary commands, no GitHub token, no PC secret, no PR body or uploaded logs. Only selected, bounded scalar fields are returned. Titles and metadata render as DOM text; browser links are constructed from validated numeric GitHub IDs.
- Server caches successful GitHub results for five minutes to respect the unauthenticated API rate limit; a concurrent-request guard deduplicates requests. Browser refresh only when the Development view is visible or explicitly requested. Time and stale-source labels are shown.
- Unavailable API sources are labelled unavailable, not disguised as zero work. A cached stale response is labelled **stale**. Running state is shown only if GitHub explicitly reports a workflow as `in_progress`.
- No percentages or ETA are invented for pull requests or CI. Existing Operations retains the **real** owner-PC Update progress.

## What this does not track yet

GitHub cannot independently observe an assistant's private drafting process, a test running solely on the owner's laptop, local git changes not pushed, or manual QA. The Development panel **does not claim** those are active, complete or pending without additional authenticated event/receipt instrumentation. A PR being open is an open review item, not a background process.

Proposed future controlled integration: expose explicit machine-produced progress receipts from HGR's local test/packaging process through an allow-listed, authenticated read-only channel, with task ID, stage, heartbeat, terminal result and last-seen time. Require stale detection, operation-identity binding, bounded history, privacy review and source verification before enabling it.

## Validation and release gate

- Confirm `node --check client/public/control/development.js` and targeted source regression.
- Check TypeScript typecheck and protected Control/cloud regression suites; verify `npm run validate:release`, full regression chain and browser build before merging a release candidate.
- Verify browser network: `GET /control/development-status` is denied for a normal user, permitted only for owner/admin, returns bounded public metadata, and honestly reports 403/rate limit/offline/stale cases.
- At desktop, small-height desktop, tablet and phone widths, confirm the rail/Operations jump affordance, no horizontal overflow, keyboard focus, disabled Refresh during requests and readable records.
- Device acceptance: compare PR/workflow state against GitHub at a known snapshot time; separately check an actual Cloud Update operation still retains truthful progress and finality.
- No deployment or VERSION bump from this source-only PR; release identity must be regenerated with the official release tooling after validation.

## Rollback

Remove the standalone Development script, Control section and navigation entries, scoped stylesheet block, and read-only preloader route. Keep all existing Control action/operation logic untouched.

## Owner-only local timeline panel — audited source candidate

The existing Development view now includes a responsive, in-flow **Development timeline** panel. It is a separate evidence source from GitHub PRs and Actions; the five-button phone bottom bar, Operations navigation, Update progress and desktop rail are unchanged. `client/public/control/development.js` independently refreshes `GET /control/development-timeline` when Development is visible or Refresh is requested. Owner-only response states are **available**, **partial** and **unavailable**, with a timestamp but no invented heartbeat. A 403 displays **Owner sign-in is required**; transport errors do not leave stale activity visible as live.

The new endpoint in `server/src/platform/control-cloud-ui-preload.ts` requires an authenticated **owner** account (an ordinary admin is deliberately insufficient for private local development metadata). It reads only fixed project-relative, read-only sources when a verified HGR checkout is physically accessible **on the same machine as the Control server**. `server/src/platform/control-development-timeline.ts` returns at most 18 sanitized entries from bounded JSONL tails: source, type, timestamp, safe IDs, available task ID and accurate verification status. It excludes raw prompts, native task text, credentials, arbitrary paths, local network addresses, filesystem location, and any client-provided source URL. Responses use the existing no-store security headers.

**Important hosting boundary:** Oracle-hosted Control cannot see the owner's Windows `.openshard` directory. It therefore **must** display local history as unavailable unless independently validated local evidence exists on that host; this is not a remote synchronization system or agent command channel. Real-time sync needs a separate authenticated outbound owner-PC transport design, security review, TTL/stale detection and owner/device acceptance. Do **not** open a PC port, read the journal from the public site, or upload private instructions to GitHub.

Validation: `npm run test:timeline-control`, `npm run test:browser:control:timeline`, the existing `regression-control-development-status` test, server typecheck and Control regressions. Test on actual PWA desktop/phone/tablet devices and owner account before merge. This remains a draft, not a release or production activation.

## Approved-device outbound timeline relay — review candidate (25 October 2026)

**Purpose:** Allow owner-only HGR Control to display a recent sanitized OpenShard/Bridge timeline from Lagz without opening a PC port. Reuse the approved-device credentials already held locally by `server/src/control-cloud-agent.ts` and verified by `server/src/platform/control-cloud-server-preload.ts`. No new credential is minted, copied into the repository or shown in browser output.

**Opt-in contract:** Sync is **OFF by default**. Only when the owner explicitly sets `HGR_DEVELOPMENT_TIMELINE_SYNC=1` in the existing HGR Control Cloud bridge process environment **after both server and PC versions are reviewed and deployed** will its already-approved heartbeat cycle send a read-only metadata snapshot, no more frequently than once per 60 seconds. The sender accepts only HTTPS to `halieus.remotewire.net`. A pending or revoked device cannot upload. The device identity must never be committed, logged or exposed.

**Upload boundary:** The existing exact-path `POST /control/cloud/agent/development-evidence` uses the existing 8 KiB body cap and approved-device credential check. The service only accepts a strict schema: up to 12 timestamped entries containing event source, event kind, status, safe record ID, task ID when actually present, and optional native changed-file count. Unknown fields, prompt bodies, native task text, arbitrary paths, URLs, secrets and unsupported states are rejected. Timestamp skew over two minutes, nonce replay and non-increasing snapshot times are rejected. Approved upload metadata is stored in the existing private Control Cloud data directory; nothing goes to GitHub or application players.

**Read boundary:** The owner-only `GET /control/development-timeline` prefers true on-server local records when available; otherwise it reads only the approved-device relay store. Device revocation immediately makes prior relay snapshots unavailable. The browser displays the server-received timestamp and differentiates fresh (up to two minutes), stale, disconnected and forbidden states without implying a running agent or successful verification. Ordinary admins, anonymous visitors and players do not receive the timeline.

**Release/security gates:** Source-only draft. Verify actual owner sign-in, approved-device upload, TLS termination, stale/offline/revoke behaviour, mobile PWA, and persistent storage on Oracle **before enabling**. No localhost-port exposure, Tailscale dependency, automated coding-agent execution, local HGR Update action, forced Git rewrite, rollout, or version bump from this batch. Roll back by clearing the opt-in process environment flag and restarting only the existing cloud bridge after approval; server rollout/rollback remains separate.

## Cloud Update when the owner checkout is a feature branch

**Safety behaviour:** Cloud Update must not demand that a running feature checkout become `main`, nor may it force-switch that checkout. The approved owner-PC Control command now uses an isolated, fixed-origin `main` clone for its *release* workflow when the owner is not on `main`; manual Git Update remains on the original worktree and requires `main`. The isolated path verifies an exact release fingerprint **before running deployment**, then executes the existing security/build/regression/package and Oracle rollback-capable gates. No new arbitrary remote shell operation or GitHub push endpoint exists.

After successful Oracle release verification, only the independent Control finalizer can record completion. For `handoff=isolated-main` it requires a matching process-local flag and leaves the original PC agent running from its existing checkout, rather than restarting the wrong branch. The existing main-checkout update still uses the original Control restart finalizer. This is a website-only release receipt, not evidence that the PC agent was upgraded. The helper's read-only `-AuditOnly` option provides a safe clone/verification check without installing dependencies, changing runtime services or deploying. A failed fingerprint check must remain failed, with no misleading 100% status. Full acceptance requires Windows PowerShell, live owner Control/PWA and Oracle credential verification after release.

## Correcting the 08:46 owner Control Update handoff

A new, authenticated Cloud Update on 25 October 2026 failed at 3% with the old non-`main` branch message even though the external Cloud bridge had already been updated. The *loopback Control listener* was still running from the owner's original feature checkout and resolved its Update script from that checkout. The fix separates Control source from owner game source using an operator-set local environment variable `HGR_CONTROL_GAME_ROOT`. Update, audit, authorization and local Control UI stay in the dedicated 4.5.7 Control code. Start, Restart and Close HGR, together with repository status, continue using the verified owner game checkout. No other localhost or cloud operation can supply a filesystem path. Preserve original Control operation receipts and the user's unfinished repo. The old failure remains visible until the owner dismisses it; that is not proof that the corrected installed listener is still broken.
