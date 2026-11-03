# HGR Control mobile shell — Logic & Philo layout reference

**Scope:** isolated 4.8-development UI source based on HGR 4.7.14 Control-notice candidate PR #235. This is not a completed 4.8.0 release or production deployment.

## Reference actually inspected

- Private Logic & Philo repository: elijahama/logic-and-philo — docs/DESIGN_STANDARD.md, client/src/App.tsx, client/src/styles.css.
- Approved design principles: desktop left nav, compact mobile contextual topbar, five fixed bottom destinations, 44px touch targets, safe areas, single-column phone reading cards, compact two-column metrics, tablet spacing and no horizontal overflow.
- Logic & Philo is an independent single-user study project. No LP branding, art, code or account assumptions were copied into HGR.

## Resulting Control navigation

- Fixed five destinations at 960px and below: Home / Live / Games / Operations / More.
- More exposes previously inaccessible Players / Performance / Development / Audit plus public Game Room link; all eight desktop destinations remain available.
- Active page and aria-current state are synchronized across rail, mobile bar and More. Escape, close and outside touch dismiss the More chooser. Keyboard-close returns focus to More.
- Canonical approved HGR Control H/cog PNG is reused in mobile header, unmodified. Bottom-tab SVGs are ordinary navigation pictograms, not new launcher H artwork.
- Compact contextual header keeps portrait Full Screen and account/profile accessible. Update-available notice stays inside normal page flow, and Review update still navigates to Operations → Update without starting deployment.
- No authentication, updater, gameplay, tournament, account stats, PWA icon or source-version behavior is changed.

## Test acceptance

- New tests/browser-control-mobile-lp-layout.mjs drives real Control section handlers with 320×760, 360×800, 390×844, 820×1180, 960×768, 1024×768, 1440×900. Checks fixed five-tab bar, all eight reachable sections, keyboard and outside interactions, viewport/scroll width, 44px touch targets, safe bottom padding, portrait Full Screen, correct canonical Control image and update notice.
- Registered as npm run test:control:mobile-lp in standard test:regression. Client/server TypeScript and targeted browser tests passed locally; full regression, build, Windows/Ubuntu CI, owner PWA portrait/fullscreen visual acceptance remain distinct gates.
- Pending separate UX refinement: long Maintenance form while keyboard is open, lengthy Audit/Development cards and owner hand-held Android/Brave PWA acceptance.

Protect original laptop checkout, approved art and 4.7.14 release. This development batch is preparatory to 4.8 but does not qualify tournament formats as owner accepted.
