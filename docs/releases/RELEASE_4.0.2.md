# Halieus Game Room 4.0.2

## Summary

4.0.2 corrects a major phone-layout failure discovered during real-device testing of Mega Board.

## Root cause

Mega Board contained a legacy runtime viewport workaround that changed mobile browsers from the normal device-width layout to a 980px desktop layout after gameplay started. The browser then physically shrank the desktop scene to the phone, making turn order, menus and the board appear miniature.

4.0.2 removes that workaround and makes responsive CSS responsible for mobile layout.

## Player-facing changes

- Mega Board remains at normal phone scale when a match starts.
- Turn Order is a true mobile layout.
- Live Mega Board fits the physical phone width instead of requiring a 680px board minimum.
- Mega metadata uses a compact swipe rail.
- Players control no longer competes with the top navigation chrome.
- Mandatory board decisions open as bounded mobile sheets.
- Fullscreen/game transitions no longer rewrite the browser layout viewport.
- Hidden Dictator gains stronger portrait and short-landscape bounds.
- Browser/PWA cache identities advance to 4.0.2.

## Gameplay rules

No gameplay, ranking, payment, property, auction, debt, card or AI rules are changed by this patch.

## Release preparation

The final release fingerprint is generated only after local validation:

```bash
npm run typecheck
npm run build
npm run test:regression
npm run prepare:release
```

Do not hand-edit the generated release fingerprint.
