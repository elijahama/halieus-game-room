# HGR 4.5.4.6 — Featured-game rail selection

Scope is intentionally limited to the selected game tile in the main Home featured-game rail.

The previous shared selected-destination treatment added a 3px brand-colour left inset plus a thick brand-colour bottom inset. On the rail's rounded selected tile these two inset shadows joined into the curved yellow/gold banner visible in owner QA.

4.5.4.6 keeps the existing dark raised selected tile, icon, spacing, radius, carousel behavior and hover behavior, but gives the feature rail its own neutral depth override:

- no yellow/gold left strip;
- no curved yellow/gold bottom band;
- no new pseudo-element or overlay;
- no change to the shared sidebar, mobile-nav or discovery-tab selection treatment;
- no game icon or branding artwork changes.

The override is deliberately loaded after the existing identity/theme cascade so it corrects only `.halieus-feature-rail button.is-active` without broad restyling.

Acceptance requires the selected game to remain clearly identifiable while the asymmetric yellow crescent/band shown in the owner screenshot is gone on both desktop and mobile presentations of this rail.
