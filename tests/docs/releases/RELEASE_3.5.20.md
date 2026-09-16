# Halieus Game Room 3.5.20

## Mega Board live-deal false-positive fix

- Selecting a trade recipient by itself no longer announces **Deal in progress** to the table.
- A live negotiation appears only after a real trade term (cash, property, bus ticket, or jail card) exists.
- Removing all recipients explicitly clears the live preview.
- Live previews are discarded when the turn changes, the game leaves active play, or the draft becomes a formal pending trade.
- The overlay independently rejects empty or previous-turn previews as a final UI safety guard.

This keeps the requested live negotiation visibility while preventing stale/empty trade banners when no deal is actually happening.
