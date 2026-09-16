# Halieus Game Room 3.6.8

3.6.8 is a room-lifecycle and layout stabilization patch.

- Password and Anagrams Race are human-only; AI setup and server AI creation are disabled.
- Opening a new Create Room flow generates a fresh room code automatically.
- Reconnect flows remap authoritative turn/winner references after socket IDs change for Cheat, Dominoes, WHOT and Blackjack.
- Open AI-filled lobbies free an AI seat when a human joins, rather than rejecting the human as "full".
- Cheat and Dominoes use the HGR dark theme correctly and receive a compact single-viewport composition.
- WHOT receives corrected icon indexing, a compact header, centred table composition and a single-scroll hierarchy.
- Mega Board Game Room/Menu chrome is thinner without altering board geometry.
- Game Room sidebar display controls sit closer to the bottom edge.
- Desktop game shells are tightened to fit the browser viewport without global zoom/transform scaling.
