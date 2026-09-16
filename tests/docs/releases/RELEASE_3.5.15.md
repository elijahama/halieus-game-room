# Halieus Game Room 3.5.15 — Website Self-Upgrade

3.5.15 fixes the owner-release workflow that allowed a newly extracted local package to be newer than the Oracle-hosted website indefinitely.

## Changed

- Start and Restart now compare the public website `/health` version with the local `VERSION` before opening the app.
- On the owner machine, when the Oracle SSH key is present and the public site is older, the launcher deploys the current release automatically.
- Player/shared copies do not contain the owner key, so the self-update check safely skips deployment and only opens the public site.
- A root-level `Update Halieus Website` launcher provides an explicit manual publish action.
- Oracle deployment validates package-version consistency before upload and again on the server before activation.
- Oracle activation now requires `/health` to report the exact candidate version; a merely healthy old process is no longer accepted.
- Windows deployment then verifies the public HTTPS hostname reports the same exact version before declaring success.
- First-deploy environment bootstrap now uses the validated candidate's env template instead of the old live application directory.

## Production safety

The existing Oracle data root and Certbot-managed HTTPS configuration remain preserved. Failed candidate builds or exact-version health checks do not overwrite production data and trigger the existing rollback path.
