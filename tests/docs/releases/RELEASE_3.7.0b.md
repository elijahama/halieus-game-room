# Halieus Game Room 3.7.0b

## Oracle candidate-build hotfix

3.7.0b fixes the TypeScript build failure discovered by Oracle Quick Deploy in the Ayo and Word Board result screens. Both screens now provide the required GameResultsScreen `onDownloadReport` callback and generate a local text game report, matching the shared results-screen contract.

This patch retains the 3.7.0a Oracle SSH private-key ACL self-repair.
