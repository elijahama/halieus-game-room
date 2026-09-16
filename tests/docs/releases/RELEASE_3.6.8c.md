# Halieus Game Room 3.6.8c

3.6.8c is a deployment-gate correction on top of 3.6.8b.

## Oracle Update repair

3.6.8b made `npm audit --audit-level=moderate` a hard Oracle candidate gate. A live update then correctly stopped after npm reported three MODERATE advisories, even though Halieus' established security acceptance rule blocks HIGH severity findings rather than every moderate advisory.

3.6.8c restores the intended policy:

- Oracle runs `npm audit --audit-level=high` after `npm ci`.
- LOW/MODERATE advisories remain visible in the command output for follow-up.
- HIGH/CRITICAL advisories return a blocking failure and prevent activation.
- Real `npm ci`, type/build, release-integrity, service health or exact version/fingerprint failures remain blocking.
- The candidate/backup/rollback sequence is unchanged, so failed validation cannot replace the current live application.
- No forced npm audit repair is used.

All 3.6.8b dependency floors and UI/gameplay changes are retained unchanged.
