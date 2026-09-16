# Halieus Game Room 3.5.8

## Invite-code history correction

3.5.8 corrects the owner invite-history behaviour introduced in 3.5.7.

- The admin snapshot exposes only whether a full invitation code is still available, never the plaintext code itself.
- Owner/Admin can deliberately reveal, hide and copy any retained invitation code from history, including used, revoked and expired invites.
- New invitation codes keep their private server-side reveal copy after status changes. Redemption remains single-use because the invite status still prevents reuse.
- Legacy invites created before full-code history was enabled remain hash-only and cannot be reconstructed. The UI labels those rows clearly instead of offering a reveal action that cannot succeed.
- No production data migration is required; the existing Oracle account store is preserved.

The approved 3.5.7 WHOT layout, mobile shell and production-only Start/Restart/Close controls remain unchanged.
