# Openshard in Halieus Game Room

Halieus Game Room uses [Openshard](https://github.com/openshard/openshard) as **optional local development provenance tooling**.

Openshard is not part of the HGR application runtime. Players do not need it, the Oracle server does not need it, and HGR gameplay must never depend on it.

Its job is narrower: when supported AI coding agents work on the HGR repository, Openshard can keep a local receipt of the evidence available from that run.

## Why HGR uses it

HGR is deliberately described as a **human-directed, AI-assisted engineering project**.

Git records the code history, but Git alone does not explain the AI-assisted work around a change. Openshard can preserve useful context such as:

- which supported coding agent was involved;
- the task excerpt available to the integration;
- files reported or observed as changed;
- commands/checks observed during the run;
- whether evidence capture was complete, incomplete or unknown;
- receipt identity and integrity information.

A receipt is evidence about the development run. It is **not proof that the code is correct**. HGR still relies on type checking, regression tests, production builds, device/playtest validation and human acceptance.

## Installation on the HGR development PC

Openshard requires Python 3.11+.

The upstream project recommends `pipx` so the CLI stays isolated from HGR's Node.js dependencies.

On Windows, first make sure the selected Python installation actually has `pip`. Some Python installations exist without it:

```powershell
py -m ensurepip --upgrade
py -m pip install --upgrade pip
py -m pip install --user pipx
py -m pipx ensurepath
py -m pipx install openshard
```

Using `py -m pipx install openshard` avoids depending on the new `pipx.exe` PATH entry during the same terminal session.

Open a new terminal after `ensurepath` so Windows refreshes PATH. If `py -m ensurepip --upgrade` itself fails, repair/modify the Python installation and enable its bundled pip component before continuing.

Then from the HGR repository root:

```powershell
openshard setup
openshard doctor
```

`openshard setup` is designed to be safe to re-run. It detects supported coding-agent integrations available on that machine and configures the repository-local capture points they support.

## HGR helper

From the repository root you can also use:

```text
scripts\windows\OpenShard-HGR.cmd setup
scripts\windows\OpenShard-HGR.cmd doctor
scripts\windows\OpenShard-HGR.cmd last
scripts\windows\OpenShard-HGR.cmd history
scripts\windows\OpenShard-HGR.cmd stats
scripts\windows\OpenShard-HGR.cmd tui
```

The no-space wrapper name is deliberate so it can be invoked directly from PowerShell without quoting. The older `OpenShard HGR.cmd` wrapper remains for compatibility; if you use it from PowerShell, call it with `& ".\\scripts\\windows\\OpenShard HGR.cmd" <action>`.

The helper does not install Openshard automatically. If the CLI is missing it prints the installation command and exits instead of modifying Python on its own.

### HGR - OpenShard TUI shortcut

HGR keeps its Windows shortcuts as one launcher family instead of scattering `.lnk` files around the project.

After refreshing launchers, the developer repository contains:

```text
HGR Launchers/
├── HGR - Start.lnk
├── HGR - Restart.lnk
├── HGR - Close.lnk
├── HGR - Update Site.lnk
├── HGR - PowerShell.lnk
└── HGR - OpenShard TUI.lnk
```

The Windows Start Menu contains the same launcher family under **Halieus Game Room**, using the same names.

The repository also includes **Open HGR OpenShard TUI.cmd** as a direct fallback if the generated links have not been refreshed yet.

After pulling the shortcut integration, double-click **FIRST RUN - Refresh Halieus Launchers.cmd**, or run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\windows\launcher-shortcuts.ps1"
```

Then open **HGR Launchers → HGR - OpenShard TUI** from the project folder, or **Halieus Game Room → HGR - OpenShard TUI** from Windows Start.

The shortcut currently reuses the approved HGR terminal/PowerShell launcher artwork. A dedicated OpenShard-facing HGR icon is intentionally deferred to the visual model-sheet/rebrand stage so the project does not accumulate another one-off icon style.

## Normal workflow

Use your coding agent normally. After the work:

```powershell
openshard last
```

For more detail:

```powershell
openshard last --more
openshard last --full
```

To browse recent AI-assisted work:

```powershell
openshard history
openshard stats
```

A useful HGR sequence is:

```text
requirement / visual QA / playtest finding
        ↓
AI-assisted implementation
        ↓
Openshard receipt
        ↓
npm run typecheck
npm run test:regression
npm run build
        ↓
human review / playtest / acceptance
        ↓
Git commit + GitHub history
```

The receipt complements the Git commit; it does not replace it.

## Local-first and repository safety

Openshard keeps local receipt history under:

```text
.openshard/
```

HGR ignores that directory in Git. Receipt history is therefore not part of:

- public source history;
- Oracle deployment state;
- HGR release identity;
- source-baseline snapshots.

Openshard's own setup may also configure agent-specific local files and uses Git-local exclusion mechanisms for credentials/configuration that should not be committed.

Do not copy capture tokens, credentials or local agent configuration into tracked HGR files.

## Telemetry and hosted sync

The open-source receipt workflow works locally and offline.

Openshard documents optional privacy-safe product telemetry and provides:

```powershell
openshard telemetry off
```

if you want to disable it on the HGR development machine.

Hosted receipt sync is also optional. HGR should treat sync as an explicit future decision rather than enabling it as part of normal setup.

## Supported agent note

Openshard currently documents capture support for coding tools including Codex, Claude Code, Cursor, OpenCode, Google Antigravity, Hermes Agent and Grok Build, with a separate Grok Bot path.

Capture depth depends on what each tool exposes. Openshard deliberately distinguishes observed Git changes from changes an agent itself positively reported, and it can mark evidence as incomplete rather than inventing certainty.

That distinction is useful for HGR because human edits, AI edits and pre-existing working-tree changes should not be conflated.

## Attribution and licence

Openshard is a separate project maintained at:

```text
https://github.com/openshard/openshard
```

Upstream project metadata credits **Michael Obasa** and licenses Openshard under **Apache-2.0**.

HGR uses the installed tool; it does not vendor Openshard source or claim it as part of HGR's own implementation.

## Part 32 — Private ChatGPT remote OpenShard workflow (25 October 2026)

A private, personal **HGR OpenShard Bridge** plugin (initial version 0.1.0) has been created as a **skills-only workflow**. It uses the separately connected Remote Desktop Commander service to reach an authorized Windows PC; it does not install a daemon, grant access to new devices, ship OpenShard binaries or expose a network shell. The owner must enable/connect the requisite apps in ChatGPT and keep the authorized remote device online.

During the initial remote-capability audit, the authorized device `Lagz` was reported online and `openshard --version` reported **0.4.7**. The CLI supports `run`, `plan`, `history`, `proof` and `mcp serve`; the **MCP server is read-only stdio** (recent shards, receipts, searchable history and relevant context), whereas `openshard run` is a distinct task-execution command. This is time-specific evidence, not a promise of future online availability or that a particular provider/model is configured.

**Execution contract:**

- Read-only status/receipt/history and repository inspection are the default. Verify actual device connectivity and the HGR repository path each session; never assume the Desktop Commander startup directory is the repository.
- Starting a provider-backed task or editing files requires an explicit scoped instruction and the relevant approval, then real remote process observation. Prefer `--dry-run` when previewing; for an approved write use OpenShard's `--write --verify --approval ask` and respect human approval prompts.
- Protect canonical HGR launcher artwork and the Masterbook; work on isolated review branches in audited batches; no automatic deployment, forced push, credential handling or shell/network exposure through Control.
- GitHub PR/CI monitoring in HGR Control is *not* a live OpenShard heartbeat. Genuine local OpenShard progress/receipts require a separate authenticated, allow-listed task-readout bridge, stale detection, and validation before showing as live.
- Receipt evidence never substitutes for regression tests, actual app build, production fingerprint checks or physical device QA.

The private ChatGPT plugin itself is maintained in the user's plugin library, not committed to the public HGR repository. The associated personal account plugin installation/connection is a separate user-controlled action. No `VERSION`, `RELEASE.json`, production server or Control action changes arise from this documentation batch.
