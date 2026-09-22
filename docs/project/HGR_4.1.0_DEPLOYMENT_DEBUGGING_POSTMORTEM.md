# HGR 4.1.0 Deployment Debugging Postmortem

**Project:** Halieus Game Room  
**Release:** 4.1.0  
**Environment:** Windows development workstation → GitHub → Oracle production server  
**Outcome:** Resolved. HGR 4.1.0 deployed and exact release identity verified on Oracle.  
**Development model:** Human-directed, AI-assisted engineering.

## Why this document exists

This incident was not one deployment bug. It was a chain of independent faults that only became visible as the previous fault was removed. The goal of the debugging session therefore changed from “make this deployment work” to “turn the assumptions that failed into automated checks”.

This record is both operational documentation and portfolio evidence. It documents the observations, hypotheses, fixes, regressions and release safeguards used to reach a verified production deployment without pretending that AI assistance was absent.

## 1. Git state blocked the updater

The updater initially found unresolved generated release files:

```text
UU RELEASE.json
UU shared/release.ts
error: Pulling is not possible because you have unmerged files.
```

Those files are generated release-identity outputs. The repository was recovered from its committed state rather than deleting the repository or using a blanket destructive reset.

The updater was then hardened so it may self-repair conflicts only for the generated identity pair while stopping safely for real source conflicts.

Relevant commit: `ede517f fix: self-heal generated release conflicts before HGR update`.

## 2. Historical regressions pinned current release metadata

The 4.0.0 regression required the current application to use a 4.0.0 asset cache-buster even while testing 4.1.0. Another regression referenced a source variable that it had never loaded.

The tests were changed to preserve historical behaviour without forcing current release metadata to impersonate an older version.

Relevant commits:

- `5e7a930 fix: load client main in 4.1 regression test`
- `12835ba fix: make 4.0 regression preserve history without pinning current release`

**Lesson:** a historical regression should preserve the behaviour introduced by an older release, not freeze metadata that is expected to change.

## 3. Oracle package and release identity disagreed

The Oracle packer omitted files that the release manifest correctly considered signed release inputs, including:

```text
.github/workflows/release-identity.yml
.gitignore
SECURITY.md
assets/branding/Halieus Game Room.ico
assets/branding/Halieus Game Room.png
server/data/word-board/SCOWL-COPYRIGHT.txt
server/data/word-board/scowl-en-us.dic
```

The packer also excluded all of `server/data`, even though that tree contains both private runtime data and legitimate static release data.

The packer was changed to include every release-signed static input while continuing to exclude runtime/player data.

Relevant commits:

- `c93df80 fix: package every release-signed Oracle deployment input`
- `39ce56b test: cover release-signed Oracle package inputs`

## 4. Package-only validation was coupled to SSH

The local package validator checked Oracle credentials before honouring `-PackageOnly`. A test that did not need a network connection could therefore fail because no SSH key was selected.

Credential validation was moved behind the branch that actually deploys.

Relevant commits:

- `a716e7c fix: let package-only Oracle validation run without SSH credentials`
- `bdf1b42 test: document credential-free package-only validation`

**Lesson:** artifact construction and remote deployment are separate responsibilities and should be testable independently.

## 5. Historical tests inspected the private/local helper

Several historical regressions referenced the ignored local Oracle helper rather than the tracked canonical helper under `tests/dev-tools/Oracle Quick Deploy/`.

That meant tests could inspect a different script from the implementation controlled by Git.

Relevant commits:

- `a55395f fix: make Oracle audit regression use tracked canonical helper`
- `338839b fix: make Oracle diagnostics regression use tracked canonical helper`
- `bf7098d fix: make Oracle packaging regression use tracked canonical helper`

## 6. PowerShell parser failures exposed script corruption

After the earlier blockers were removed, the canonical deployment helper produced parser errors including unexpected tokens and missing braces. Investigation found malformed syntax and a duplicated tail of deployment logic.

The duplicate/corrupt section was removed and the release workflow gained a PowerShell parser stage so a syntactically invalid Oracle helper cannot silently become an accepted release input.

**Lesson:** file integrity and language validity are different guarantees. A checksum can prove that a file is the expected file; it cannot prove that PowerShell can parse it.

## 7. STEP 3B was added: validate the real Oracle archive locally

The updater gained a pre-deployment stage:

```text
STEP 3B - Validating the real Oracle deployment package locally...
```

This builds the actual Oracle archive without making network calls and verifies package completeness and release integrity before commit/push/deploy continues.

A failure now stops with no deployment:

```text
[STOPPED] Oracle package preflight failed.
Nothing has been committed, pushed or deployed by this run.
```

This moved packaging failures from production time into local preflight.

## 8. The decisive clue: the packer said 3.7.0b

Preflight eventually printed:

```text
Packing Halieus Game Room 3.7.0b for Oracle...
```

The workspace being deployed was 4.1.0.

The repository contains a historical test snapshot under `tests/` with its own `VERSION`, `RELEASE.json` and `package.json`. Because the Oracle helper lived below that directory and discovered the project root by walking upward for `VERSION + package.json`, it stopped at the historical snapshot.

That also explained the misleading error that `.gitignore` was missing: the file existed at the real root, but the packer was looking inside `tests/`.

The root-discovery rule was strengthened with a real HGR root marker, and the package regression now requires the archive version to match the workspace version.

Relevant commits:

- `55eca8d fix: anchor Oracle packer to the real HGR workspace root`
- `acd3815 test: protect Oracle root discovery from historical test snapshots`
- `52ead5e test: require Oracle archive to match workspace version`

## 9. Successful preflight

The repaired pipeline reached:

```text
Deployment package completeness verified: 339 release-integrity inputs present.
Release integrity verified: hgr-4.1.0-2a28f1b159ebf310 (339 files)
PASS: real Oracle archive includes root manifest files and passes release integrity; no network calls.

[OK] Typecheck, current-release build, regressions and Oracle package preflight passed.
```

## 10. Successful Oracle deployment

The deployed application then reported and independently verified the exact release:

```text
Oracle local health verified exact release:
4.1.0 / hgr-4.1.0-2a28f1b159ebf310

Oracle release verified:
4.1.0 / hgr-4.1.0-2a28f1b159ebf310

Halieus application update verified: 4.1.0
Production data were preserved.
Halieus Game Room 4.1.0 is live.

HGR UPDATE + WEBSITE DEPLOY COMPLETE
```

The public-route diagnostic was unavailable during that run, but deployment success did not depend on it: the application was checked directly on Oracle and required to match the exact version and release fingerprint.

## Debugging method

The practical loop was:

**Observe → isolate → inspect → form a hypothesis → change the smallest relevant component → add regression protection → rerun the pipeline → inspect the next failure.**

The failure chain was:

**Git conflict → stale historical regression assumptions → incomplete Oracle archive → PackageOnly/SSH coupling → wrong helper references → PowerShell corruption → incorrect project-root discovery → valid 4.1.0 archive → verified deployment.**

The important behaviour was refusing to treat every new error as evidence that the previous fix had failed. Each repaired layer allowed the pipeline to reach a later layer that had not previously been exercised.

## Safeguards created by the incident

The deployment system ended the incident with additional guarantees:

- generated release-identity conflicts can be repaired narrowly and safely;
- historical regressions do not pin current metadata;
- all signed static release inputs are packaged;
- private/runtime server data remain excluded;
- package-only validation does not require SSH credentials;
- tests inspect the tracked canonical Oracle helper;
- PowerShell syntax is parsed in CI;
- the real Oracle archive is preflighted before deployment;
- project-root discovery cannot stop at the historical `tests/` snapshot;
- archive version must equal workspace version;
- the running Oracle application must match the exact release fingerprint.

## What this demonstrates

This incident demonstrates practical work with Git recovery, regression testing, CI/CD, PowerShell, release integrity, artifact packaging, Oracle deployment, fault isolation and defensive engineering.

HGR is an AI-assisted project. AI was used to accelerate repository inspection, interpret failures, propose hypotheses, modify scripts and tests, and trace interactions across the release pipeline. The developer supplied the real execution evidence, requirements and constraints; decided whether proposed behaviour was acceptable; ran and observed the production workflow; and repeatedly required structural fixes rather than bypasses.

The portfolio claim is therefore not “all code was written manually”. It is that the project was directed, tested and debugged as an engineering system, with AI used as a development tool and the resulting behaviour verified against real execution.

## Final result

**Release:** 4.1.0  
**Verified fingerprint:** `hgr-4.1.0-2a28f1b159ebf310`

The lasting outcome was not only that 4.1.0 went live. Several implicit deployment assumptions were converted into explicit, automated and testable guarantees.
