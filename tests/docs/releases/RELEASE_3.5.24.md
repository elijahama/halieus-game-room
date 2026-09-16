# Halieus Game Room 3.5.24

## Mega Board Autopilot placement repair

- Surgical Mega Board layout patch only; no updater, server, rules, trade or networking changes.
- Removes Autopilot from the desktop match-header grid flow. It had been forced across all six metadata columns on its own row, increasing header height and therefore shrinking the viewport-sized board.
- Desktop Autopilot now sits in the header's already-reserved right-side space as an out-of-flow control, so enabling/disabling it cannot change board dimensions.
- Tablet/mobile keeps the existing in-flow behaviour where viewport-locked board sizing is not used.
- Retains the 3.5.22 board containment/rail-scroll safeguards and the 3.5.23 deployment-health compatibility fix unchanged.
