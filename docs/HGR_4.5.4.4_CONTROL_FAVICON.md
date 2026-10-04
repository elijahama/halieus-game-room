# HGR 4.5.4.4 — Control favicon

Scope is intentionally limited to the browser-tab favicon for HGR Control.

- Cloud Control `/control/` uses the owner-approved blue Control artwork through `/control/control-icon.png?v=4.5.4.4-control-favicon1`.
- The private/Tailscale Control UI uses the same approved artwork through `/control-icon.png?v=4.5.4.4-control-favicon1`.
- The approved Control artwork authority remains `assets/branding/references/HGR Control Launcher.png` with the hash pinned in `control-artwork.json`.
- No H geometry, cog geometry, launcher artwork, manifest install icon, Apple-touch icon, PWA cache, layout, cloud relay, telemetry, or remote operation behavior is changed in this batch.

The `4.5.4.4` label is an audited implementation sub-version. The repository's product VERSION remains on its normal three-component semantic-version line until the 4.5.4 release is consolidated.

Acceptance requires the HGR Control browser tab to visibly refresh to the approved blue Control icon on a real owner browser; source/CI validation alone does not prove browser favicon cache replacement.
