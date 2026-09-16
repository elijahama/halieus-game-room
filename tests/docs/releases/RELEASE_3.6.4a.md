# Halieus Game Room 3.6.4a

Minor Mega Board anti-stall patch.

- Adds a server-authoritative 45-second manual roll countdown.
- If the current human does not roll before expiry, their existing Mega Board Autopilot is enabled automatically so the match continues.
- The takeover stays on the same seat and can be reversed with Take Control.
- Reconnects and repeated state broadcasts do not reset the deadline.
- The countdown replaces the ordinary clock slot while active, preserving the approved Mega Board header footprint; on phones the active roll timer remains visible.
- Manual roll requests are rejected while Autopilot owns the seat until Take Control is used.
- Ludo, Poker and Mega Board board geometry are unchanged.
