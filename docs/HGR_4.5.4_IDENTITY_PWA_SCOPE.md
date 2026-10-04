# HGR 4.5.4 — Identity & PWA cleanup scope

This batch fixes stale browser/install identities without redesigning approved artwork.

## Main Halieus Game Room

- Browser favicon must use the current approved Halieus launcher-family H artwork.
- Installed PWA icon must use the same approved main HGR artwork.
- Mobile portrait branding must retain the `Halieus Game Room` wordmark beside the H rather than collapsing to an icon-only mark.

## HGR Control

- Browser favicon and installed PWA icon must use the approved blue Control artwork.
- Control remains a separate blue product identity and must not reuse the main gold HGR icon.

## Cache / install acceptance

Favicon, manifest and install-icon revisions must be changed together so existing Chrome/Brave installs are prompted to refresh their identity assets. Source/CI success is not considered owner-device acceptance; the final check is the icon visible in a real browser tab and a real installed phone PWA.

## Prohibited

- no generic/slab-serif replacement H;
- no redrawing of launcher H geometry;
- no model/reference sheet as a runtime icon;
- no Control/main icon cross-over.
