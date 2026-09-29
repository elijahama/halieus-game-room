# HGR platform navigation — Part 19 history and 4.5.3 mobile contract

The original Part 19 navigation work was introduced in 4.5.1. Its desktop hierarchy remains useful history, but its mobile assumptions are **superseded by the 4.5.3 mobile app-shell contract below**.

## Current 4.5.3 mobile navigation

Mobile deliberately does **not** mirror the desktop sidebar. It behaves like a native app shell:

- the bottom bar is permanently visible and belongs to the viewport, not to page content;
- only the central content pane scrolls;
- the five bottom slots are **Home → Games → Join → Players → Guilds**;
- the centre **Join** button opens the existing Join Game room-code flow; it does not route to Games or New Game;
- Games is a normal destination in its own slot;
- Rankings and Watch Game are secondary utilities available from the compact top tools control;
- Inbox and the player profile remain in the top-right utility area;
- Full Screen also lives in that fixed top utility row, beside the tools and Inbox controls, so it never floats over game/page content;
- on mobile, Inbox opens as a compact top-right panel below the header rather than a full-height drawer;
- the desktop sidebar/hamburger is not part of the phone information architecture.

The mobile shell owns exactly one `100dvh` viewport. `.halieus-main` is the scroll container, while the top bar and bottom navigation are fixed siblings. Mobile also disables the root `.page-enter` transform so a transformed ancestor cannot change the containing block used by `position: fixed`.

## Why the previous fixes kept producing the wrong result

The earlier regression contract explicitly asserted the wrong mobile hierarchy: **Home, Players, New Game, Guilds, More**. It also required Games and Join Game to live inside the More sheet. That meant a future change toward the requested app-style bar could be treated as a regression and pushed back toward the old structure.

The 4.5.3 regression now protects the actual contract instead:

- exact primary labels and order: Home, Games, Join, Players, Guilds;
- Join must call the real Join Game flow and must not call `setView("games")`;
- Rankings/Watch Game stay outside the primary bar;
- the mobile shell is a single fixed viewport with only `.halieus-main` scrolling;
- the bottom bar must remain `position: fixed` at the viewport bottom;
- Full Screen must be rendered inside the top utility bar and the old floating emblem must be absent;
- the mobile Inbox must stay below the header and below 65% of the phone viewport in browser validation;
- a browser regression scrolls the phone content and verifies that the nav does not move.

This is intentionally different from desktop. Desktop may continue to expose the fuller destination rail, including Rankings and Inbox.

## Release safety

This change is presentation/navigation only. Game rules, socket protocols, ranking calculations and progression ownership are unchanged. Release identity remains generated from `VERSION`.
