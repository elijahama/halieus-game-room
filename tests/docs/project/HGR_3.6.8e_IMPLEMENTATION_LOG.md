# HGR 3.6.8e Implementation Log

## Mega Board Bank live inventory hotfix

- Added a compact live Bank stock counter directly to the existing clickable Bank control.
- Counter displays Houses, Hotels, Skyscrapers and Train Depots from `gameState.bankInventory`.
- The board counter remains read-only and consumes the same server-authoritative GameState already broadcast to players and spectators.
- Expanded the existing Bank modal with explicit Available / Out of stock states.
- Preserved Mega Board board geometry, scale, rails and centre composition.
- Added regression coverage for the live counter, click-through Bank control and authoritative inventory defaults.
