# HGR Source Baseline Policy

Halieus Game Room keeps a canonical source snapshot in half-version intervals.

## Rule

The source baseline advances only when the project reaches a `.0` or `.5` milestone.

| Live versions | Canonical source baseline |
| --- | --- |
| 4.0.x – 4.4.x | 4.0 |
| 4.5.x – 4.9.x | 4.5 |
| 5.0.x – 5.4.x | 5.0 |
| 5.5.x – 5.9.x | 5.5 |
| 6.0.x – 6.4.x | 6.0 |
| 6.5.x – 6.9.x | 6.5 |

The same pattern continues for future versions.

## Current baseline

The live project is currently in the 4.1.x line, so the canonical source baseline is **4.0**.

The exact 4.0 source is commit:

`ec0d2193d8b6133452d57f312d86e2ea90f23e74` — **Import Halieus Game Room 4.0.0 source**

Two Git branches represent source snapshots:

- `source-baseline-4.0` is immutable and permanently preserves the 4.0 source.
- `source-baseline` is the moving pointer to the newest canonical source baseline.

GitHub's **Download ZIP** action on `source-baseline` is therefore the current source-material ZIP.

## Automatic refresh

`.github/workflows/source-baseline.yml` watches changes to `VERSION`.

When `VERSION` reaches an exact half-version milestone such as `4.5.0`, `5.0.0`, `5.5.0`, or `6.0.0`, the workflow:

1. creates an immutable `source-baseline-X.Y` branch at that exact commit;
2. moves the `source-baseline` branch to the same commit;
3. builds `Halieus-Game-Room-source-X.Y.zip`; and
4. uploads that ZIP as a workflow artifact.

Patch and intermediate versions do not move the source baseline. For example, `4.5.1`, `4.6.0`, and `4.9.9` all continue using the 4.5 source snapshot.

## Safety rule

A frozen milestone branch must never be rewritten. If `source-baseline-4.5` already exists at a different commit, the workflow fails instead of silently replacing it.
