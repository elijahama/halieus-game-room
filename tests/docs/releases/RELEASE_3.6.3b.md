# Halieus Game Room 3.6.3b release contract

Date: 31 August 2026
Release class: minor letter-suffix polish patch
Baseline: Halieus Game Room 3.6.3

## Scope

3.6.3b implements the approved Owner control-panel tab-hub mockup. The seven Owner sections now read as one connected horizontal control on desktop instead of seven detached grey cards. The active section receives a longer blue underline, a contained active surface and stronger icon/label emphasis. Primary tab labels and supporting metadata use heavier weights for clearer hierarchy. Mega Board’s persistent Game Room / Menu strip is also widened slightly and its labels are made bolder, without touching board sizing or gameplay.

## Protected areas

This patch does not change Ludo, Poker, Mega Board gameplay/board geometry, card-table layout, server game rules, room state, AI behaviour or multiplayer protocols. It does not install a new game module. WHOT and Blackjack remain retired under the 3.6.3 stabilization contract.

## Responsive behaviour

Desktop retains the connected seven-segment tab hub. Tablet and narrow layouts fall back to compact card segments in four- then two-column arrangements so labels do not crush or overlap. The active underline remains longer than the pre-3.6.3b indicator in every layout.

## Versioning

Public Halieus minor-polish builds use compact letter suffixes such as `3.6.3b`. npm workspace metadata uses the SemVer-compatible equivalent `3.6.3-b`; the public UI, VERSION file, health/release identity and Halieus release fingerprint use `3.6.3b`.

## 3.6.3b version contract correction

Halieus display/runtime version remains `3.6.3b`. npm workspace metadata uses the SemVer-compatible `3.6.3-b`. Windows launcher/deployment checks and the Oracle installer normalize these forms before package comparison, while `RELEASE.json`, health responses, build markers and release fingerprints continue to use the Halieus-facing `3.6.3b` identity. Automatic website version ordering also understands letter patches (`3.6.3` < `3.6.3a` < `3.6.3b` < `3.6.4`).
