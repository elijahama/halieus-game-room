# Gameplay Rules Implemented

## Match setup

- 2 to 8 active players
- Starting cash: £2,500
- Highest opening roll starts; tied players reroll
- Casual and Ranked match types
- Casual host can enable or disable the Free Parking jackpot
- Ranked mode uses no Free Parking jackpot

## Board

The board uses 52 clockwise positions, including the additional Mega properties and special spaces. The board source of truth is `shared/games/mega-board/board.ts`.

## Speed Die

- Numeric 1, 2 and 3 faces add to movement
- Doubles use the two white dice only
- Numeric triples allow the destination choice mechanic
- Bus face automatically awards one ordinary Bus Ticket when one remains, then the player still chooses either white die or their combined total for movement
- If an expiry card is encountered during that BUS award, previously held tickets expire first, the expiry card leaves the match permanently, and the newly awarded ticket survives
- Mr. Monopoly performs the bonus movement rule
- Jail rolls use the two white dice
- The Speed Die retires while every ownable board asset has an owner
- If a forfeit or bankruptcy returns any ownable asset to the Bank, the Speed Die becomes active again until all ownables are owned again

## Bus Tickets

A held Bus Ticket replaces the normal roll and lets the player choose a valid destination anywhere along the current board side in either direction. At a corner, either adjoining side is available. Chance and Community Chest spaces are excluded from Bus Ticket destination choices in the current project rules.

## Development and asset management

- Mega colour-group building eligibility
- Houses
- Hotels
- Skyscrapers
- Train Depots on stations
- Mortgages and sale of development
- A player in Jail may still trade, build, sell, mortgage, unmortgage and manage Train Depots before resolving the Jail decision
- Developed properties and stations with Train Depots may be traded. Their development transfers intact with the board space
- Owned assets are presented clockwise from GO

## Free Parking

Every Free Parking landing creates a global temporary notification for players and spectators. With the jackpot enabled, the notice states the amount collected or that the pot is empty. With the jackpot disabled, the notice still identifies the landing and states that no jackpot action applies.

## Post match awards

The Kass Maneuver Award counts direct Birthday Gift to GO and GO to Birthday Gift transitions during live gameplay. If nobody performs the maneuver, the award shows No award. Ties are broken deterministically using match turn order, then player id.

## Privacy rule

During active play, each player sees their own cash only. Opponent assets and development remain public. Spectators may see all player cash.
