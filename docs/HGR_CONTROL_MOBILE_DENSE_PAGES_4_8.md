# HGR mobile Control — Maintenance, Development and Audit refinement

**Development draft, 3 November 2026.** Depends on mobile-layout draft #236 and on versioned 4.7.14 Control release candidate #235. No changes to tournament logic, owner action APIs, Oracle deployment or canonical HGR artwork.

## What changed

- Maintenance: Starts and Ends date/time and separate IANA zones remain explicitly visible, now with improved one-column phone spacing, legible legends, >=48px targets, 16px fields to prevent iOS input zoom, focus outlines and scroll margins. Save/cancel, immediate Close, exact windows, DST validation, no generic auto-reopening and zero-active-room security remain unchanged.
- During focus in a Maintenance date/zone/reason field <=700px, the fixed five-tab nav hides and returns on blur. This is CSS-only focus behavior, not OS-level keyboard detection.
- Audit: timestamp-first single-column receipt cards, more legible text and wrapping long action summaries. No records changed.
- Development: at <=960px, long batch entries, workflow status and GitHub source links wrap in a readable single column with >=44px tap areas. Existing status/receipt evidence is preserved.
- Installed PWA: the original standalone Control manifest, start URL, scope and canonical H/cog icon remain unchanged. Standalone CSS accounts for safe areas. Mobile stylesheet asset URL advances from lp-layout-mobile-1 to lp-layout-mobile-2 so an installed browser does not reuse the old layout file on the next approved release. The existing Control service worker does not precache that CSS and leaves its request network-managed; protected Control notification icons and the worker remain unchanged. Headless Playwright cannot reliably simulate an installed OS-level Brave PWA, so real-device acceptance stays open.

## Verified test contract

- New tests/browser-control-mobile-dense-pages.mjs drives real Control section handlers and synthetic read-only long receipts at 320/360/390/820px; tests no horizontal overflow, Maintenance form field width/focus, reduced viewport keyboard-size simulation, nav hide/restore, input and link touch targets, PWA manifest and standalone CSS.
- Previous tests/browser-control-mobile-lp-layout.mjs still tests navigation and 320/360/390/820/960/1024/1440 layouts. Client/server TypeScript checks retained.
- New npm run test:control:mobile-dense integrated into full test:regression. Full regression, build, GitHub Windows/Ubuntu CI and owner physical Android/Brave installed PWA review are independent gates.
- No VERSION bump, no launcher artwork changes, no owner permissions or updater logic changed, no deployment.

## Owner-device acceptance still needed

Use an installed Control PWA on Android/Brave to check Start/End datetime, time-zone fields and visitor reason with the physical keyboard, footer return after blur, long real Audit and Development records, portrait/landscape/fullscreen, and absence of nested/double scrolling. Reduced Playwright viewport is only a software approximation.
