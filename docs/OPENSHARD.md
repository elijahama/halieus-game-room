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
