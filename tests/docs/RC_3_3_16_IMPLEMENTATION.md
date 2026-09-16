# RC 3.3.16 — Mortgage ownership-scope hotfix

## Fixed

- Mortgage legality now checks developments owned by the player who is mortgaging, not developments owned by other players in the same colour group.
- A minority owner can mortgage an undeveloped property such as Knightsbridge even if another player has developed Park Lane or Mayfair.
- The same ownership-scoped rule is used by both property-management UIs, the server mortgage handler, debt auto-liquidation, and AI liquidation.
- A player is still correctly blocked from mortgaging any property in a colour group while that same player still owns developments elsewhere in that group.
