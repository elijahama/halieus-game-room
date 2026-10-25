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
