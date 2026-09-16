# Halieus Game Room 3.6.4 release contract

3.6.4 is a feature patch. It promotes three requested roadmap games into real Halieus room modules and completes the accompanying Games/Owner UI cleanup requested during 3.6.3b acceptance.

## New playable modules

- **Word Game** — competitive five-letter puzzle with six guesses and Wordle-style exact/present/absent feedback. Supports 1–8 players, spectators, room chat, invites, recovery and archived results.
- **Password** — 2–8 player clue-and-guess rounds with a rotating clue giver, a private password, one-word clue validation and a first-to-five score target.
- **Anagrams Race** — 2–8 player shared scramble race. First correct solve scores the round; first to five wins.

All three use the shared Halieus Word Arena transport/runtime so room lifecycle, reconnect, spectator, active-game discovery, account statistics, chat and end-of-game reporting are consistent without duplicating network plumbing.

## Games library

Word Game, Password and Anagrams Race are removed from **Coming next** and appear as available games. The roadmap now retains Villagers & Mafia, Settlers, Spot the Match, Cheat / BS and Dominoes. Repeated category eyebrow/title combinations were removed so each category has one clear heading.

## Owner / Invites polish

The Owner overview summary remains because it is operationally useful, but is now a deliberate four-metric strip with a separate quick-action row. The Invites area receives a connected three-tab sub-navigation, separate create/history cards, normalized field sizing, cleaner filters/empty states and removal of the stray label-marker artefacts.

## Protected scope

Ludo remains locked. Poker table/gameplay sources remain locked. Mega Board board geometry and player rail remain locked. 3.6.3b letter-suffix version normalization remains in the deployment/update path for future minor polish releases.
