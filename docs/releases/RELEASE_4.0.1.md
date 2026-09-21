# Halieus Game Room 4.0.1

## Summary

4.0.1 is a UX and responsive-layout patch focused on mobile quality and clearer post-match presentation.

## Player-facing changes

- Reworked Mega Board ranked-result presentation.
- Clearer rating before/after movement.
- Separate placement, performance and award bonus blocks.
- Award names displayed as readable chips instead of a long sentence.
- Mobile final standings convert from a wide desktop table into labelled player cards.
- Results / Stats / Awards navigation matches the three available tabs.
- Mobile result actions stack cleanly.
- Existing mobile-shell and Ludo phone improvements are retained as part of this patch line.

## Rules and authority

No ranked scoring formula or authoritative gameplay rule changes are introduced by this release.

All ranked values continue to come from server-recorded `rankedResults`.

## Release preparation

This repository represents 4.0.1 source development. The final `RELEASE.json` fingerprint must be generated locally after tests/builds pass by running:

```bash
npm run prepare:release
```

Do not hand-edit the generated fingerprint.
