# HGR 3.7.0b implementation log

- Reproduced the Oracle candidate TypeScript contract failure reported for 3.7.0a.
- Root cause: the shared `GameResultsScreen` requires `onDownloadReport`, while the new Ayo and Word Board result-screen instances omitted it.
- Added an Ayo text game-report download action.
- Added a Word Board text game-report download action.
- Added 3.7.0b regression coverage for the required shared results-screen contract.
- Made the 3.7.0a regression version check forward-compatible so its SSH ACL invariant remains protected by later 3.7.0 patch builds.
- Preserved the 3.7.0a Windows OpenSSH private-key ACL self-repair hotfix.
