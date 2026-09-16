# Deployment Overview

HGR is deployed to a Linux production environment using Node.js, Nginx and HTTPS.

## Candidate-first deployment

```text
working source
   ↓
release preparation
   ↓
integrity manifest / fingerprint
   ↓
secure transfer
   ↓
candidate dependency install
   ↓
candidate build
   ↓
validation
   ↓
activate
   ↓
health + fingerprint check
   ↓
keep or rollback
```

A failed candidate build must leave the current production application untouched.

## Repository vs deployment package

GitHub tracks safe engineering history and documentation.

Oracle deployment packaging should include only files required to install, build and run HGR.

Files such as `README.md`, `.gitignore` and `SECURITY.md` belong in the repository but do not need to be mandatory runtime build inputs.

Private keys, runtime databases, account/player data and backups never belong in GitHub.
