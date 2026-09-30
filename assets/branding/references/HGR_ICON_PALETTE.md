# HGR Icon Palette & Artwork Authority
Version: 4.5.3

## Artwork authority

The finished PNG icon artwork stored in `assets/branding/references/` is the visual authority for HGR launcher icons.

For launcher artwork:

- use the approved PNG pixels as-is;
- PNG → ICO conversion is allowed for Windows shortcuts;
- resizing for required export sizes is allowed only when aspect ratio is preserved;
- do not redraw the H;
- do not recreate badges from coordinates;
- do not substitute flat fills for the rendered surface;
- do not add new gradients, outlines, highlights or shadows;
- do not "clean up" an approved PNG by changing its geometry or colour treatment.

The reference PNGs are not merely inspiration. Once a PNG is selected as the approved role asset, it is the source artwork for that role.

The original HGR icon establishes the shared surface principle: a simple readable H, strong colour contrast, a rounded physical tile, integrated upper sheen, and a restrained darker rim/lower edge. The sheen belongs to the surface; it is not a floating glass strip.

## Semantic role palette

| Role | Colour | Hex |
| --- | --- | --- |
| Main Halieus | Gold | `#F4C430` |
| Start | Green | `#22C55E` |
| Restart | Orange | `#F59E0B` |
| Close | Red | `#EF4444` |
| Update | Light blue | `#38BDF8` |
| PowerShell | Slate | `#64748B` |
| OpenShard | Purple | `#A855F7` |
| HGR Control | Royal blue | `#4F7BFE` |

These hex values define the semantic role families. Approved rendered reference PNGs may contain lighter/darker pixels caused by their built-in sheen, rim, antialiasing and shading; those rendered pixels must not be flattened back to the base hex.

## H treatments

The approved system includes:

- Full Color (Primary)
- Monochrome (Gold)
- White Only
- Black Only
- Inverted (Dark BG)
- Dark on Light (Light BG)
- Outline / Flat (Subtle)

All treatments preserve the approved H proportions for that reference family.

## Control

HGR Control owns royal blue `#4F7BFE`.

A final Control launcher PNG must live in this reference folder and visually follow the selected approved launcher family. Until that final Control PNG is approved, no generator may invent a replacement Control style.

## Folder rule

`assets/branding/references/` = human-approved source/reference artwork.

Other icon folders are runtime/export/archive locations only. They must not override the reference artwork.


## Canonical launcher PNG role map

These friendly filenames are the only launcher-art inputs used by the Windows exporter:

| Launcher role | Approved reference PNG |
| --- | --- |
| Main HGR | `HGR Main.png` |
| Start | `HGR Start.png` |
| Restart | `HGR Restart.png` |
| Close | `HGR Close.png` |
| Update Site | `HGR Update.png` |
| PowerShell | `HGR PowerShell.png` |
| OpenShard TUI | `HGR OpenShard.png` |
| HGR Control | `HGR Control.png` |

The friendly files are byte-identical aliases of the selected approved artwork. Windows may resize them for icon delivery and wrap them as ICO, but it must not redraw them.
