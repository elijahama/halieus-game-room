# HGR 4.5.1 — theme progression and Achievement Bar hotfix

Baseline: latest main, efc5da7d3f7dbb7c7ae764b450adaf2144253b02. Implementation of the approved scope; no new audit or gameplay-rule changes.

## Changes

- Twelve Core HGR presets are always available. Nineteen Unlockable presets use the central shared theme requirements: server-verified Gamer Score, completed matches, or named achievements. The account API rebuilds progression from authoritative archives before granting or saving a theme. Submitted score/rating/award claims are ignored. Owner/admin/Test Lab status grants no theme rewards.
- Locked cards display their requirement and cannot be selected. Applying an earned preset revalidates it on the server. The current account's stored preset is checked on account changes; unavailable presets fall back to Blue Circuit. Custom creation, light/dark/system, text size, density and reduced motion remain independent of progression.
- Compact shared Achievement Bar on account overview, Home and player profiles. It shows verified Gamer Score, a next achievement milestone and recent award information; opens a full achievement view. Elo remains exclusively in Rankings. No invented percentage of a maximum Gamer Score.
- Theme Library keeps aligned equal-height cards, fixed selection placement, a separate integrated footer, and one header close button. Phone layout uses one column to preserve legibility. Custom creation is reachable directly from the library; locked cards do not fade their requirement text into unreadability.
- Website logo, first-paint mark and platform favicon share the canonical H and black/white contrast logic. Backgrounds remain theme-coloured. Contrast-critical layers switch without interpolating through grey. Contextual game favicons remain game-specific. Anagrams Race/Ayo artwork and the established Mega Board polish are preserved.
- All six developer/Windows shortcut references now use the approved fixed exports in client/public/brand/launcher. Project and Start Menu links are refreshed without running the target applications or deployment actions. Existing rendered artwork is preserved.
- Personal platform appearance remains separate from the server-owned Mega Board Room Style. Existing pregame host ownership, unlock validation, synchronization, start lock, spectator and recovery contracts are retained and tested. No geometry or game-rule changes.

## Verification coverage

Typecheck, full regressions, production build, five responsive sizes (1440x900, 1280x600, 820x1180, 390x844, 360x640), nested Create Room/Game Menu appearance panels, real authenticated theme unlock/spoof tests, signed-in Home/profile Achievement Bar, theme-aware favicon/logo and black/white foreground checks. Existing gameplay, mortgage, doubles, Bus Ticket, result/podium/dock, recovery and release-integrity checks remain enabled. Stale tests change only for approved shortcut paths and the new contrast-safe favicon treatment.

Local Windows shortcut validation reads the generated .lnk icon references and checks ICO headers and target paths. It does not launch shortcuts. Physical-device testing and production deployment are outside local validation; the existing large-bundle build advisory remains.

## Theme policy

The exact Core IDs, progression gates and displayed conditions live together in shared/platform/themeProgression.ts. Progression is earned from verified completed games; client-local preferences are never evidence of an unlock. Custom palettes intentionally remain unrestricted and may use any colours, even when a similarly coloured preset is locked.

## Exact files changed

- `RELEASE.json`
- `client/index.html`
- `client/public/halieus-mark.svg`
- `client/src/App.tsx`
- `client/src/platform/accounts/AccountPanel.tsx`
- `client/src/platform/components/AchievementBar.tsx`
- `client/src/platform/components/HomeScreen.tsx`
- `client/src/platform/components/ThemeButton.tsx`
- `client/src/platform/theme.ts`
- `client/src/styles/hgr-4.5.1.css`
- `docs/HGR_4.5.1_THEME_PROGRESSION_HOTFIX.md`
- `scripts/release-integrity.mjs`
- `scripts/windows/launcher-shortcuts.ps1`
- `server/src/platform/accounts.ts`
- `shared/platform/themeProgression.ts`
- `shared/release.ts`
- `tests/browser-part17.mjs`
- `tests/browser-part18.mjs`
- `tests/browser-website-identity.mjs`
- `tests/regression-4.1.0.mjs`
- `tests/regression-4.5-foundation.mjs`
- `tests/regression-brand-theme-launcher-coherence.mjs`
- `tests/runtime-part18.mjs`
