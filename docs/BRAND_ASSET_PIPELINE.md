# HGR Brand Asset Pipeline

Status: HGR 4.5 foundation

Halieus Game Room keeps **design source** and **generated launcher/runtime assets** separate.

## Canonical identity

The approved HGR utility family uses one shared Halieus H geometry.

Default brand colour:

- Halieus: `#DAA017`

Launcher action colours:

- Start: `#4E7F5D`
- Restart: `#E67E22`
- Close: `#B44B4B`
- Update Site: `#4B78BB`
- PowerShell: `#64748B`
- OpenShard TUI: `#8B5BD6`

The launcher family stays matte, restrained and functional. OpenShard is a specialised member of the family, not a redesign of the Halieus platform identity.

## Source assets

Editable SVG sources live at:

```text
assets/branding/Halieus Game Room.svg
assets/branding/launchers/matte/
├── Start Halieus Game Room.svg
├── Restart Halieus Game Room.svg
├── Close Halieus Game Room.svg
├── Update Halieus Website.svg
├── HGR PowerShell.svg
└── HGR OpenShard TUI.svg
```

The website also carries the canonical browser fallback at:

```text
client/public/halieus-mark.svg
```

## Generator

Run:

```bash
npm run assets:brand
```

The generator uses Playwright to rasterise the committed SVG source family and writes:

- Windows launcher `.ico` files;
- launcher preview `.png` files;
- the base HGR `.ico`;
- favicon PNG/ICO outputs;
- PWA 180 / 192 / 512 px icon outputs.

To refresh only the editable SVG sources:

```bash
npm run assets:brand:source
```

## Important separation

`FIRST RUN - Refresh Halieus Launchers.cmd` and `scripts/windows/launcher-shortcuts.ps1` **do not generate or recolour artwork**.

The launcher refresh process only creates Windows shortcuts and points them at existing approved icon files.

This separation is deliberate:

```text
approved design rules
        ↓
brand asset generator
        ↓
SVG / PNG / ICO assets
        ↓
launcher shortcut refresher
        ↓
Windows shortcuts
```

If a custom icon is missing, the shortcut layer falls back safely. It must never invent a replacement at runtime.

## Browser identity

The HGR portal starts with the canonical Halieus mark.

When a player enters a game, the browser tab reuses that game's current approved catalogue SVG. Leaving the game restores the Halieus identity.

This follows the 4.5 rule: **refine and reuse existing approved artwork rather than creating a parallel icon system.**
