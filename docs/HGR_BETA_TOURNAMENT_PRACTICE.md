# HGR 4.7.0 — Invited Beta Tournament Practice (development candidate)

**Owner requirement:** When an owner/admin enters HGR Beta Test Lab, they must be able to test Mega Board tournament gameplay with ordinary non-admin accounts, AI opponents, or both. Other players are invited into the **test match only**; they are never given Beta, owner, or administrator privileges. All participants understand that the match is non-scoring.

## Implemented in isolated 4.7.0 candidate

- Owner/admin-created Mega Board rooms in Beta Test Lab request an explicit `betaTournamentTest` flag. The server validates the creator's **authenticated role** and refuses arbitrary accounts attempting to set that flag; a client toggle alone is not sufficient.
- The server enforces **non-ranked, non-Blitz** rules on practice rooms. The ordinary Mega Board engine, normal cash/rent/property rules, spectator/gameplay mechanics, and existing AI opponent controls still work.
- Existing signed-in HGR room invitations and Inbox allow a Beta owner/admin host to invite any eligible active ordinary player **without administrator status**. A `[BETA]` player-name prefix is not treated as an identity; the room host's authenticated account ID is checked. Invitations are short-lived, recipient-scoped and can be dismissed. The Beta lobby refuses uninvited guest, wrong-account and expired/dismissed-invitation joins. Recovery is bound to the same authenticated account AND existing reconnect token.
- Invitation UI identifies **BETA PRACTICE INVITATION** and **Test only, no ratings or rewards**. The Beta Mega Board create screen explicitly explains that ordinary players and AI are allowed and official progression is unaffected. Ranked/Blitz controls are disabled while in Beta.
- The server marks the **whole room** as practice. A finished Beta match is never written to normal finalised-session history, permanent replay history, normal Ranked or Tournament ratings. It is not projected into Guild results. Practice game completion notices remain inside the room rather than announcing private test participants globally. Personal-stat/Gamer Score/quick-play builders defensively ignore any accidentally recorded marked practice archives.
- The normal room save remains permitted for reconnect/recovery. Practice records are not treated as public competitive accomplishments.

## Scope boundary: still developing

These are **Beta practice matches**, not full Guild tournament fixtures. The verified official Guild-v-Guild two-board fixture still requires real account-backed Guild membership and forbids AI; practice rooms cannot be misbound as official fixture boards. Draft bracket testing, synthetic Guild lineups, whole tournament simulations, test-only standings and fixture UI need separate audited work. In particular, **do not** claim that a practice match automatically triggers a scored Guild fixture or a 5.0.0 tournament.

## Acceptance evidence and remaining gates

The dedicated `npm run test:beta:tournament` exercises actual authenticated owner/player sessions, invitation HTTP and Inbox, WebSocket join and AI/start handlers, rejection of uninvited/ordinary creators, cross-account reconnect, official session archive, permanent replay, stats, Gamer Score and normal-room parity.

Pending before merge/release: typechecks, focused and full HGR regressions, signed release integrity/build/browser checks, both Windows and Ubuntu CI, and real Android/tablet invite acceptance. The repository VERSION remains **4.6.10**, because 4.7.0 requires fully playable two-board Guild fixtures and result settlement. No Oracle deployment, active-room closure, branding edits, permission grants or live rating changes are authorized by this source batch.
