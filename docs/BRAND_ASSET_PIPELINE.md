# HGR Brand Asset Policy

Status: HGR 4.5 foundation

The approved Windows launcher artwork is **not generated during normal HGR development or shortcut refresh**.

## Visual source of truth

All approved PNG files stored directly under:

`assets/branding/references/`

form the current visual reference set.

The reference set is intentionally directory-led rather than hard-coded to a fixed filename count. Before changing launcher artwork, inspect the complete current contents of that folder.

Reference artwork outranks generated interpretations. A launcher asset must not be redrawn from a written palette/geometry description when an approved visual reference is available.

## Protected approved assets

Approved launcher icons live in:

```text
assets/branding/launchers/matte/
```

Those tracked `.ico` files are design assets. Scripts must not overwrite, recolour, delete or regenerate them.

The base HGR Windows icon lives at:

```text
assets/branding/Halieus Game Room.ico
```

## Shortcut refresh

`scripts/windows/launcher-shortcuts.ps1` only creates or refreshes Windows shortcuts.

It may:

- point a shortcut at an existing approved icon;
- fall back to the base HGR icon when an optional icon is unavailable;
- refresh Windows' shortcut/icon cache.

It must never generate artwork.

## Generated previews

Any experimental/generated launcher artwork belongs only in:

```text
assets/branding/launchers/generated-preview/
```

That directory is intentionally separate from the approved `matte` assets and is ignored by Git.

The legacy preview generator `scripts/windows/generate-launcher-icons.ps1` is allowed to write only to `generated-preview`.

## Browser and PWA identity

Browser/PWA assets under `client/public` are separate from the approved Windows launcher family. Updating them must not modify `assets/branding/launchers/matte`.

## Rule

```text
approved launcher artwork
        ↓
tracked immutable project asset
        ↓
shortcut refresher references it
```

There is no automatic path from theme generation, website assets or launcher refresh into the approved Windows icon files.
