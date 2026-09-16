# HGR 3.6.4 — Implementation Log

Scope approved in HGR Part 11:

- promote Word Game, Password and Anagrams Race from roadmap tiles to real playable room modules;
- remove redundant repeated Games-category headings;
- clean the Owner overview summary/action strip;
- complete the Invites tab/layout cleanup identified during 3.6.3b acceptance;
- preserve Ludo, Poker core gameplay/table presentation and Mega Board board geometry;
- preserve the corrected letter-suffix updater/deployment normalization introduced for 3.6.3b.

Implementation uses a shared Word Arena runtime with game-specific rules and one consistent Halieus shell for lobby, invites, room chat, spectators, reconnect and results.
