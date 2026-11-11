# Solo tournament formats — 4.8.0

For the owner-authorized 4.8.0 release, the Games area exposes authenticated Solo tournaments **by default**. HGR_SOLO_TOURNAMENT_ALPHA=0 explicitly disables both capability and routes; unset or 1 enables them. Any ordinary signed-in non-Beta player can host or join; no owner/admin privilege is needed.

## Format rules

| Rule | Single elimination | Double elimination |
| --- | --- | --- |
| Entry | Exactly four distinct accounts | Exactly four distinct accounts |
| Seeding | Registration order: 1 vs 4, 2 vs 3 | Same deterministic opening |
| Advancement | Two semifinal winners meet in the final | Winners meet in the winners final; semifinal losers meet in losers round 1; that winner meets the winners-final loser |
| Championship | Final winner | Winners finalist vs losers finalist; if the losers finalist wins, the same two players play a fresh Grand Final reset |
| Elimination | One verified loss | Two verified losses |
| Byes/ties | No byes. No manual or timeout winners | Same; every finished board requires one verified original winning account |
| Missing/interrupted game | Remains unresolved for original-player recovery | Same; no automatic disqualification |
| Forfeit | Existing authenticated in-game forfeit; host departure forfeits only their own seat | Same |
| Pre-start replacement | Two original entrant approvals; durable reset journal and strict room deletion | Same for every round |

Completed receipts and champions are immutable. New rounds receive new room generations and server-minted match identities. A reset final is marked **not required** when the undefeated finalist wins the first Grand Final. Tournament results do not update normal Ranked ratings.

## Player journey

Games → Mega Board tournaments opens Solo registration and brackets, with a Guild tournaments route alongside it. Share the invitation ID with the other three players. The host starts only after all four accounts register. Each pairing creates an ordinary two-human, unranked, non-Blitz, non-Beta room; the tournament host links its code before the players start. Existing room controls remain authoritative. Return uses the existing same-device recovery token when available; Watch enters the existing spectator flow. The UI refreshes on focus, online, pageshow and visible-tab polling and shows saving, success and failure feedback.

Two original players may approve replacing a never-started lobby. The UI cannot name a winner or bypass server recovery guards. Guild single/double brackets use two real board receipts and the owner-approved third-game decider after a 1–1 split. See [Guild tournament policy](HGR_GUILD_TOURNAMENT_BRACKETS_4_8.md).

## Validation and remaining acceptance

- All 96 possible Solo double-elimination result paths satisfy two-loss elimination and the conditional Grand Final reset.
- Coordinator tests cover both reset champions, an undefeated champion, duplicate receipts, restoration after every round and tampered participant refusal.
- Existing real-start single-elimination, registration and six crash-boundary reset tests remain passing.
- Real React controls pass at 390/820/1440px and 100–200% text size, including creation, seed, link, return/watch, reset consent and truthful API rejection.
- Separate remaining work: physical Android/iPad PWA background recovery and closed-app push delivery, cross-device recovery policy, match report/replay navigation, integrated CI and owner acceptance. These are not replaced by component tests.
- The assembled server completed both formats using real invited accounts, authenticated sockets and actual game forfeits; champions and receipts survived restart. VERSION is 4.8.0 under the owner’s release instruction. Deployment remains separately verified by exact public identity.
