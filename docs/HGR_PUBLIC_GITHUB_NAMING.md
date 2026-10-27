# HGR public GitHub naming policy

**Approved 27 October 2026.** Use product versions, features, subsystem names and dates for public GitHub identity. Internal conversation/session sequence identifiers belong in the private handoff, not new GitHub branch names, PR titles, merge titles, release notes or public documentation headings.

## Examples

| Surface | Approved | Avoid |
| --- | --- | --- |
| Branch | `fix/mobile-join-flat-control-fullscreen` | Numbered conversation prefix |
| PR | `fix(mobile): remove Join embossing (4.6.7)` | A conversation number in the title |
| Commit | `fix(control): retain fullscreen recovery` | A chat-session sequence label |
| Masterbook heading | `4.6.6 — Adaptive gallery mobile layouts` | A conversation-number heading |
| Release | `HGR 4.6.7` | A release named for a chat installment |

Existing public Git commit hashes, merged PR URLs, historical branches, and technical source filenames may still contain older conversation numbering. **Do not rewrite published commits or delete unfinished branches/PRs to conceal those historical identifiers.** This policy is forward-looking, and any archival cleanup must be separately audited for open PRs, running Git worktrees, references, CI paths and signed release integrity.

The Windows/Ubuntu PR workflow checks **newly created pull requests** against this rule. Previously created pull requests are grandfathered because GitHub does not permit changing a PR's head branch in place without replacement and historical references must not be silently broken.

Current work is grouped by HGR semantic versions; `4.6.x` covers foundational updates and `5.0.0` remains reserved for a complete, owner-accepted Mega Board Tournament Mode. Historical engineering entries may retain their original trace identifiers when they are functional keys rather than public-facing titles.
