# HGR 3.6.4a Implementation Log

Scope: Mega Board anti-stall roll timer only.

The authoritative GameState now stores `turnRollDeadline` and `turnRollDeadlinePlayerId`. Manual human roll phases receive one fixed 45-second deadline. The AI coordinator observes expiry and enables the existing human-seat Autopilot at the seat's configured difficulty, records the takeover, broadcasts a global notice, and continues through the normal automation engine. Deadline state is persisted and cleared whenever the roll phase ends or automation already owns the seat.

The client renders the countdown in the existing Mega Board header time slot to avoid expanding the protected layout. At ten seconds or less it enters an urgent visual state. The phone header explicitly keeps the active roll timer visible.
