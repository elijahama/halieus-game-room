# HGR Control — responsive mobile layout

**Scope:** HGR Control mobile interface, prepared alongside release 4.7.14 and subsequent 4.8 development work. This record defines the HGR layout and its acceptance requirements independently. It does not declare a completed tournament milestone or a production deployment.

## Mobile design standard

- Preserve HGR's distinct colour palette, typography and canonical Control H/cog artwork. Do not recreate launcher-family glyphs.
- On screens up to 960px use a compact contextual header with current section, owner profile and accessible portrait Full Screen. Keep update-status notices within normal page flow.
- Fixed five-destination bottom navigation: **Home / Live / Games / Operations / More**. More exposes **Players / Performance / Development / Audit** and a return to the public Game Room. All eight sections remain accessible.
- Keep one active page across phone and desktop, with accurate aria-current and keyboard focus. The additional-section chooser closes on selection, Escape, Close or outside touch.
- Use a full-width single-column reading layout for phones, compact paired metric tiles where appropriate, proportional tablet grids and unobstructed vertical scrolling. Respect 44px minimum touch targets and display safe areas; avoid horizontal scrolling.
- Preserve owner authorisation, scheduled maintenance, live games, existing update/progress controls and security boundaries. Layout never triggers an operation.

## Implementation and files

- client/public/control/index.html — compact header, mobile tabs, additional-section chooser.
- client/public/control/control.js — section selection, keyboard behaviour, active-state accessibility.
- client/public/control/mobile-layout.css — responsive card grids, safe bottom clearance, nav styling.
- tests/browser-control-mobile-lp-layout.mjs — retained historic filename for existing regression compatibility.

## Verification and acceptance

- Browser regression exercises original Control section handlers at 320×760, 360×800, 390×844, 820×1180, 960×768, 1024×768 and 1440×900: all eight sections, five fixed destinations, More and keyboard controls, canonical imagery, touch targets, safe padding and no horizontal overflow.
- npm run test:control:mobile-lp is part of full regression. Build, release identity, Windows/Ubuntu CI and physical device review are independent gates.
- Maintenance, Development and Audit refinements are documented in docs/HGR_CONTROL_MOBILE_DENSE_PAGES_4_8.md.
- Installed Android/Brave PWA testing still needs to verify keyboard opening, portrait/landscape fullscreen and dense admin panels.

Preserve previous release snapshots, original laptop development source and approved HGR artwork. Supporting Control UI improvements do not satisfy the 4.8 Solo/Guild tournament-format goal by themselves.
