# HGR AI Provenance Architecture

## Status

**Adopted for the 4.1.x development line.**

This document defines how Halieus Game Room records and explains AI-assisted engineering work.

The system is deliberately layered. No single tool is treated as proof that a change is correct.

## Why this exists

HGR is a human-directed, AI-assisted project.

That description is accurate, but by itself it is too vague for a serious engineering portfolio. It does not answer questions such as:

- Which work was performed with an AI coding agent?
- What evidence exists from that agent session?
- Which files changed?
- Which checks were observed?
- Was the receipt complete?
- Did the change actually pass HGR's own tests?
- Who decided whether the result was accepted?

OpenShard adds a provenance layer between AI-assisted implementation and the rest of HGR's engineering evidence.

## The HGR evidence chain

HGR now treats development evidence as a chain rather than one source of truth.

```text
Human requirement / playtest / design decision
                    |
                    v
          AI-assisted implementation
                    |
                    v
             Openshard receipt
      what the agent run could evidence
                    |
                    v
                Git diff
        what changed in source control
                    |
                    v
       HGR automated validation gate
 typecheck · regressions · build · integrity
                    |
                    v
        Human visual / gameplay review
                    |
                    v
          accept · revise · reject
                    |
                    v
             GitHub history
```

Each layer answers a different question.

| Layer | What it establishes |
| --- | --- |
| Human requirement | Why the change exists and what success means |
| Openshard receipt | Evidence available from the AI-assisted run |
| Git | Exact source history that entered the repository |
| HGR validation | Whether project-defined automated checks pass |
| Human QA | Whether behaviour, visuals and gameplay match the intended result |
| GitHub history | Reviewable project record and release chronology |

## What an Openshard receipt means

For supported coding-agent sessions, Openshard can record evidence such as:

- coding agent / integration involved;
- task excerpt available to the integration;
- observed or agent-reported file changes;
- checks or commands visible to the integration;
- receipt identity and integrity information;
- whether capture evidence was complete, incomplete or unknown.

That makes a receipt useful as a development record.

## What an Openshard receipt does not mean

A receipt is **not** a correctness certificate.

It does not replace:

- TypeScript type checking;
- HGR regression tests;
- release-integrity validation;
- production builds;
- multiplayer testing;
- browser/device testing;
- game-rule review;
- visual QA;
- human acceptance.

A receipt may accurately record that an agent ran a test. That is different from proving the test is sufficient.

## Human ownership remains explicit

The HGR owner remains responsible for:

- product direction;
- gameplay and platform requirements;
- acceptance criteria;
- visual decisions;
- deciding which AI-generated implementation is accepted;
- testing priorities;
- deployment decisions;
- rollback decisions;
- documentation standards;
- release boundaries.

The AI implementation layer is substantial, but ownership of the product and acceptance of the output are not delegated to the receipt system.

## Runtime boundary

Openshard is **development tooling only**.

It must not become a runtime dependency of:

- the React client;
- the Node / Express server;
- Socket.IO gameplay;
- Oracle production services;
- player accounts;
- guilds;
- feedback storage;
- game state;
- source-baseline release archives.

If Openshard is unavailable, HGR must still build, run, deploy and play normally.

## Storage boundary

Local receipt history lives under:

```text
.openshard/
```

HGR ignores that directory in Git.

This is intentional:

- receipts remain local by default;
- they do not alter release fingerprints;
- they do not pollute source-baseline snapshots;
- they do not become production data;
- credentials or capture configuration are not committed accidentally.

Hosted receipt sync is a separate decision and is not required by HGR.

## Git and Openshard are complementary

Git answers:

> What source entered the repository, and when?

Openshard answers:

> What evidence did the supported AI-assisted development run expose?

Neither replaces the other.

An Openshard receipt can exist for work that is never committed. A Git commit can also contain human edits or changes from outside a captured agent session.

HGR therefore must never claim that a receipt proves authorship of every line in a commit unless the evidence genuinely supports that statement.

## Relationship to the release gate

The preferred HGR sequence is:

```powershell
# after the supported AI coding session
openshard last --more

# HGR validation
npm run typecheck
npm run test:regression
npm run build
npm run validate:release
```

A release should be described using the outcome of the HGR validation gate, not merely the existence of an AI receipt.

## Relationship to source baselines

HGR freezes canonical source snapshots at half-version milestones:

```text
4.0 -> 4.5 -> 5.0 -> 5.5 -> 6.0 -> 6.5 ...
```

Openshard receipt state is deliberately excluded from those snapshots.

The source baseline answers:

> What was the canonical HGR source at this milestone?

The receipt system answers:

> What evidence exists around supported AI-assisted development sessions?

These are separate records.

## Relationship to the implementation log

The implementation log records accepted engineering changes and important corrective work.

Openshard receipts can support that history, but raw receipts should not be copied wholesale into the implementation log.

Documentation should instead summarise:

- the requirement;
- the architectural or implementation decision;
- important validation;
- known limitations;
- whether further visual/playtest review remains.

## Portfolio explanation

A concise portfolio explanation is:

> Halieus Game Room is a human-directed, AI-assisted multiplayer software project. I define the product behaviour, game rules, architecture requirements, testing criteria and acceptance decisions. AI tools are used extensively for implementation and debugging. I use Git for source history, HGR's regression/release pipeline for project validation, and Openshard receipts where supported to preserve provenance evidence from AI coding sessions.

A more technical explanation is:

> I separate provenance from validation. Openshard can record evidence from supported AI coding sessions, Git records the source that actually entered the project, automated HGR checks verify project-defined contracts, and I perform the final gameplay/UX acceptance. That prevents an AI receipt from being mistaken for proof that software is correct.

## Interview discussion points

If asked why Openshard was added:

1. HGR already disclosed substantial AI assistance.
2. The missing piece was a structured provenance trail for supported coding-agent sessions.
3. Openshard adds receipts without becoming part of the application runtime.
4. HGR still independently validates code through its own typecheck, regression, build and release-integrity process.
5. Human requirements and acceptance remain explicit.

If asked why receipts are ignored by Git:

1. local receipt state is operational provenance, not application source;
2. it may contain machine-specific capture metadata;
3. source baselines should remain deterministic application snapshots;
4. the repository documents the workflow without requiring private receipt data to be public.

## Limitations

Not every AI interaction is automatically captured.

For example, work performed through a remote integration that does not expose a supported local coding-agent session may appear in Git history without an Openshard receipt.

HGR documentation must therefore say **"receipts where supported"**, not claim universal AI capture.

Receipt completeness also depends on what the coding tool exposes. Missing evidence should remain missing rather than being inferred.

## Operational guide

Installation, Windows setup, commands, telemetry controls and day-to-day usage are documented separately in:

- [OPENSHARD.md](../OPENSHARD.md)

The conceptual AI-assistance policy is documented in:

- [AI_ASSISTED_DEVELOPMENT.md](../AI_ASSISTED_DEVELOPMENT.md)

The canonical source archive policy is documented in:

- [SOURCE_BASELINE_POLICY.md](SOURCE_BASELINE_POLICY.md)

## Attribution

Openshard is an independent open-source project.

HGR uses it as external developer tooling and does not claim ownership of its implementation. The upstream project is licensed under Apache-2.0.
