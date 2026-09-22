# HGR Design System v1 — Implementation Map

This document converts the approved HGR redesign direction into a real implementation sequence.

The goal is not to make every screen look identical. The goal is to make every part of HGR feel like the same product while preserving game-specific identity and gameplay geometry.

## 1. Source files

The implementation layers are:

- `client/src/index.css` — historical/global styles and existing game-specific CSS.
- `client/src/styles/hgr-theme.css` — compatibility bridge created during the first branding pass.
- `client/src/styles/hgr-design-v1.css` — **current HGR Design System v1 implementation layer**.

The v1 file loads last and is the authority for new shared product UI.

## 2. Brand tokens

Primary identity:

- HGR Yellow: `#FFC200`
- Deep Navy: `#081B2B`
- Sky Blue: `#00AEF0`
- Coral Red: `#FF5B5B`
- Success Green: `#22C77A`

Yellow is the platform brand/primary-action colour. Green is semantic success/readiness, not the main CTA colour.

Dark and light mode use separate surface stacks. They share hierarchy, spacing and semantics, but are not simple colour inversions.

## 3. Component contracts

### Buttons

Current selectors bridged into v1:

- `.button-primary` -> yellow HGR primary action
- `.button-outline` -> neutral secondary action
- `.button-muted` -> quiet utility action
- `.button-danger` / `.mini-danger-button` -> destructive action
- `.button-ghost` -> low-emphasis action

New reusable names are also available:

- `.hgr-button`
- `.hgr-button--primary`
- `.hgr-button--secondary`
- `.hgr-button--muted`
- `.hgr-button--ghost`
- `.hgr-button--danger`

### Inputs

Native `input`, `select` and `textarea` receive shared HGR surfaces, border and focus treatment.

New classes:

- `.hgr-input`
- `.hgr-select`

### Cards / panels

Existing shared product selectors are bridged into the same surface system, including:

- Home cards
- live-room panels
- game inbox
- future-game cards
- guild cards
- card-game lobby/control panels
- rebuild panels
- Word Arena panels

New generic primitive:

- `.hgr-card`

### Tabs / chips / status

New primitives:

- `.hgr-tabs`
- `.hgr-tab`
- `.hgr-chip`
- `.hgr-status`
- `.hgr-status--online`
- `.hgr-status--progress`
- `.hgr-status--waiting`
- `.hgr-status--danger`
- `.hgr-status--offline`

### Modal / toast

Existing Game Menu/invite/status surfaces are bridged.

New primitives:

- `.hgr-modal`
- `.hgr-toast`

### Typography

New explicit hierarchy helpers:

- `.hgr-display`
- `.hgr-heading`
- `.hgr-subheading`
- `.hgr-body`
- `.hgr-caption`

## 4. Responsive rules

The approved redesign is always reviewed in six states:

1. dark desktop
2. light desktop
3. dark tablet
4. light tablet
5. dark phone
6. light phone

Implementation breakpoints:

- desktop: above 1024px
- tablet: 721px–1024px
- phone: 720px and below

Shared product UI can reflow at those breakpoints. Protected board/table geometry is not changed by Design System v1 unless a game-specific redesign patch explicitly targets it.

## 5. Current code mapping

### Platform shell

Current shared selectors covered in v1:

- `.halieus-sidebar`
- `.halieus-mobile-bar`
- `.halieus-home-build-popover`
- `.halieus-game-chrome`
- `.halieus-side-nav button`
- `.halieus-global-join`
- `.halieus-game-menu-trigger`

### Home / social

Current selectors covered in v1:

- `.halieus-section-card`
- `.halieus-game-inbox`
- `.halieus-live-games`
- `.halieus-home-games`
- `.halieus-home-recent`
- `.halieus-future-games`
- `.halieus-player-tools`
- `.guilds-panel`
- `.guild-card`

### Shared game shells

Current selectors covered in v1:

- `.card-game-lobby-card`
- `.card-game-control-panel`
- `.rebuild-panel`
- `.word-arena-intro`
- `.word-arena-roster`
- `.word-arena-scoreboard`
- `.word-arena-stage`
- `.word-arena-room-activity`

Poker and Mega Board gameplay geometry remain protected during this foundation pass.

## 6. Redesign sequence

The implementation sequence is now fixed:

### Phase 1 — Design System Foundation
**Status: implemented**

- real tokens
- dark/light surface stacks
- button hierarchy
- cards/panels
- inputs/focus
- tabs/chips/status
- modal/toast treatment
- platform chrome
- desktop/tablet/phone contracts

### Phase 2 — Signed-out landing
Next implementation target.

Required states:

- desktop dark/light
- tablet dark/light
- phone dark/light
- signed-out intro/arrival transition

Target hierarchy:

1. HGR navigation
2. hero / value proposition
3. Create Account + Explore Games
4. featured games
5. community / social proof
6. brand promise
7. footer

### Phase 3 — Signed-in Home / platform shell

- Home/dashboard hierarchy
- Continue Playing
- Active Rooms
- Friends activity
- game discovery
- Guild/community access
- notifications/profile
- desktop sidebar
- tablet navigation
- phone bottom navigation

### Phase 4 — Canonical game shell

- room identity
- players
- join/invite/share
- chat/activity
- host/settings
- spectator state
- results access
- mobile actions

### Phase 5 — Game redesign order

1. Mega Board
2. Ludo
3. Poker refinement
4. Blackjack
5. WHOT
6. Connect Four
7. Hidden Dictator
8. Ayo
9. Word Board
10. Word Arena / Password / Anagrams
11. remaining classic modules

Every game is reviewed in the same six theme/device states before moving on.

## 7. Acceptance criteria for Design System v1

The foundation is accepted when:

- primary HGR CTAs are yellow in both themes;
- dark and light mode both have intentional, readable surface hierarchy;
- focus states are visible and brand-consistent;
- shared cards/buttons/modals no longer invent unrelated radius/shadow treatment;
- tablet/phone spacing and touch targets remain usable;
- game rules and protected board/table geometry are unchanged;
- future redesign patches use the v1 tokens instead of adding new arbitrary colour systems.

## 8. Rule for future work

A concept image is not an implementation.

Each approved concept must be translated into:

1. real token/component decisions;
2. specific code selectors/components;
3. desktop/tablet/phone behaviour;
4. dark/light behaviour;
5. regression coverage;
6. testable acceptance criteria.

That is the process for every redesign phase from this point onward.
