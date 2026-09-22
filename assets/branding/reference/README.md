# HGR Branding References

This folder is the visual source of truth for Halieus Game Room branding work.

## Reference artwork

Place the approved reference artwork here. Do not rebuild the design from memory or from generic colour rules when a reference exists.

Preferred canonical name:

`HGR Launcher Family Reference.png`

The reference can be a presentation board / composite image. Once reviewed, the approved launcher exports should be saved under:

`assets/branding/reference/launchers/`

Expected export names:

- `Start Halieus Game Room.png` or `.ico`
- `Restart Halieus Game Room.png` or `.ico`
- `Close Halieus Game Room.png` or `.ico`
- `Update Halieus Website.png` or `.ico`
- `HGR PowerShell.png` or `.ico`

## Rule

The Windows launcher generator does **not** invent, recolour or redraw HGR launcher artwork anymore.

It only converts approved assets from this folder into cache-busted Windows ICO files.

If approved exports are missing, launcher generation intentionally stops.

This protects the actual design reference from being replaced by increasingly approximate procedural versions.
