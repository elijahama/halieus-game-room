# HGR 4.0.2 Implementation Log

## Scope

HGR 4.0.2 is a **mobile layout recovery patch** prompted by real phone testing of the 4.0.1 build.

The recorded failure was structural rather than cosmetic: Mega Board changed the browser's layout viewport after the game started, causing phone screens to render a desktop composition and then shrink it into the physical display.

## Observed failure

The phone recording showed a consistent transition:

1. Game Room and Mega Board waiting-room screens rendered at normal phone scale.
2. Starting Mega Board changed the turn-order screen into a tiny centred desktop page with large unused space.
3. The Mega Board game menu and live board inherited the same miniature composition.
4. Browser zoom/orientation interaction could then enlarge/crop the board while a mandatory property decision was open.
5. Returning to the Game Room restored a normal phone-scale layout.

That transition matched a legacy runtime effect in `client/src/App.tsx` that rewrote the viewport to `width=980` while Mega Board was active.

## Root-cause correction

### Runtime viewport mutation removed

File: `client/src/App.tsx`

The old effect that changed the viewport to `width=980`, `981`, and `982` on touch devices has been removed.

The new contract is documented directly in source:

- the browser stays at device width;
- fullscreen does not rewrite layout width;
- game transitions do not rewrite layout width;
- responsive CSS owns phone/tablet composition.

This avoids a hidden global scale state leaking across game phases.

### Static viewport made safe-area aware

File: `client/index.html`

The canonical viewport is now:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

The 4.0.2 browser/PWA asset query identities were updated at the same time.

## Mega Board phone layout

Files:

- `client/src/index.css`
- `client/src/games/mega-board/components/TurnOrderScreen.tsx`

### Turn-order screen

The ordering page now has a dedicated `mega-ordering-page` layout hook.

On phones:

- Game Room and Game Menu actions form a two-button mobile rail;
- the ordering card uses the full physical viewport width;
- token choices stay inside the viewport;
- headings and controls use phone-scale typography;
- no desktop viewport emulation is required.

### Live board

The legacy mobile rule giving `.board-grid` a 680px minimum is explicitly cancelled inside the Mega Board phone layout.

The board now:

- has `min-width: 0`;
- uses 100% of the available phone width;
- retains a square aspect ratio;
- keeps authoritative spaces/tokens unchanged;
- reduces only decorative centre content so the playable board remains readable.

The Players control also returns to normal flow on the phone so it does not compete with the shared Game Room/Menu chrome.

### Game menu

Mega Board still uses the original shared `GameMenu` component rather than the newer card-game menu subclass. 4.0.2 explicitly gives that original menu the same phone bottom-sheet contract: full usable width, bounded `100dvh` height, internal scrolling and safe-area padding.

### Metadata

Mega Board room/mode/player/time/status metadata becomes a horizontally scrollable phone rail rather than being hidden or creating multiple header rows.

## Mandatory decision sheets

Mandatory board decisions now use a fixed, bounded mobile sheet instead of a card scaled over the centre of the board.

The sheet:

- anchors to the bottom of the physical viewport;
- uses an explicit high overlay layer;
- has a bounded height;
- scrolls internally;
- remains usable through phone viewport height changes;
- avoids the zoom/crop failure seen in the recording.

This is presentation-only. Purchase, auction, debt, card and other authoritative decision rules are unchanged.

## Hidden Dictator safeguards

The recording also showed Hidden Dictator during a phone orientation change.

4.0.2 adds explicit safeguards for:

- narrow portrait screens;
- short coarse-pointer landscape screens;
- role/policy cards with no desktop minimum widths;
- compact government and policy controls;
- one-column portrait flow.

These rules do not force device orientation. They only ensure the layout stays bounded when the browser rotates.

## Code comments

Non-obvious 4.0.2 code is documented in-source, including:

- why runtime viewport mutation is prohibited;
- why Mega Board cancels the historical 680px phone minimum;
- why decorative board-centre content is reduced separately from game geometry;
- why mandatory decisions are viewport-level sheets;
- why short-landscape Hidden Dictator has its own density rule.

## Regression coverage

New test: `tests/regression-4.0.2.mjs`

It guards against:

- `width=980/981/982` returning to `App.tsx`;
- legacy viewport-emulation helper names returning;
- loss of the device-width + `viewport-fit=cover` HTML viewport;
- loss of the Mega Board phone ordering hook;
- Mega Board phone board minimum-width regression;
- mandatory decision sheets reverting to board-centred overlays;
- Hidden Dictator losing portrait/short-landscape guards;
- mixed 4.0.2 package versions.

The historical 4.0.1 regression now accepts later 4.0.x patch identities while continuing to verify the 4.0.1 ranked-results contract.

## Validation boundary

The GitHub source has static regression guards, but the final release must still be tested in the canonical laptop workspace.

Before generating the release fingerprint:

```bash
npm run typecheck
npm run build
npm run test:regression
```

Then run:

```bash
npm run prepare:release
```

`RELEASE.json` and `shared/release.ts` remain generated files and must not be hand-edited.
