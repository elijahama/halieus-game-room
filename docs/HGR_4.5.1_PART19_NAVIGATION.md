# HGR 4.5.1 — Part 19 platform navigation parity

Date: 25 September 2026

This follow-up closes the navigation backlog recorded at the end of the Part 18 implementation note. It is a platform-shell change only; game rules, room protocols, ranking calculations and progression ownership are unchanged.

## Implemented

- Desktop and mobile now use the same destination hierarchy: **Home → Games → Players → Rankings → Guilds → Inbox**.
- **Join Game** remains a global action rather than occupying a destination-tab slot. On mobile it lives in the fixed top bar and remains available in the navigation drawer.
- Signed-in mobile navigation uses six equal-width destinations, including direct Rankings and Guilds access instead of routing both through Players.
- Inbox remains an overlay rather than pretending to be a persistent page; its mobile destination displays the unread request/invitation count.
- The old mobile CSS assumption that the third bottom-navigation button is always Join is explicitly neutralised, so Players only receives the theme accent when it is actually selected.
- Narrow-phone rules reduce icon/label footprint without introducing horizontal scrolling or changing safe-area ownership.

## Regression contract

The normal `npm run test:regression` chain now asserts:

- all six signed-in mobile destinations exist;
- Join is not rendered as a destination tab;
- the fixed mobile header retains a global Join action;
- six-column account navigation is present in the final 4.5.1 override layer;
- legacy third-button Join styling cannot leak onto Players.

Release identity remains generated from `VERSION`. The release-identity workflow is expected to regenerate `RELEASE.json` and `shared/release.ts` after this source commit passes typecheck, regressions and browser release validation.
