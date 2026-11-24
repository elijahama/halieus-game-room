/** Pure HGR Spar/Cha-Cha rules. Based on the documented Ghanaian last-trick
 * variant (Pagat): 35 cards, no A♠, follow suit, 5 tricks, final only scores.
 * Stone-pool match length is an explicitly selected house-rule variant.
 * No code or original assets have been copied from other Spar applications.
 */
import { randomInt } from "node:crypto";
import { SPAR_MAX_PLAYERS, type SparCard, type SparRank, type SparSuit, type SparTrickPlay } from "./types.js";

export const SPAR_SUITS: readonly SparSuit[] = ["C", "D", "H", "S"];
export const SPAR_RANKS: readonly SparRank[] = ["5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const SPAR_STONE_POOL = 5;
export const SPAR_TRICKS_PER_HAND = 5;

/** Eight seats use a 40-card house pack (5–A, all suits). Otherwise keep the canonical 35. */
export function makeSparDeck(playerCount = 2): SparCard[] {
  return SPAR_SUITS.flatMap((suit) =>
    SPAR_RANKS.filter((rank) => playerCount === SPAR_MAX_PLAYERS || (rank !== "5" && !(rank === "A" && suit === "S")))
      .map((rank) => `${rank}${suit}` as SparCard));
}

export function shuffleSparDeck(deck: readonly SparCard[]): SparCard[] {
  const output = [...deck];
  for (let i = output.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function sparSuit(card: SparCard): SparSuit {
  return card.slice(-1) as SparSuit;
}
export function sparRank(card: SparCard): SparRank {
  return card.slice(0, -1) as SparRank;
}
export function sparValue(card: SparCard): number {
  return SPAR_RANKS.indexOf(sparRank(card));
}
export function sparFinalTrickPoints(card: SparCard): number {
  const rank = sparRank(card);
  return rank === "6" ? 3 : rank === "7" ? 2 : 1;
}

export function dealSparHands(
  playerIds: readonly string[], dealerSeat: number, deck: readonly SparCard[],
): { hands: Record<string, SparCard[]>; remaining: SparCard[] } {
  if (playerIds.length < 2 || playerIds.length > SPAR_MAX_PLAYERS || new Set(playerIds).size !== playerIds.length) {
    throw new Error("Spar requires 2–8 unique seated players.");
  }
  if (!Number.isInteger(dealerSeat) || dealerSeat < 0 || dealerSeat >= playerIds.length) {
    throw new Error("Invalid Spar dealer seat.");
  }
  if (deck.length < playerIds.length * 5 || new Set(deck).size !== deck.length) {
    throw new Error("Not enough unique cards to deal Spar.");
  }
  // The dealer deals a batch of 3, then 2, starting after the dealer.
  const hands = Object.fromEntries(playerIds.map((id) => [id, [] as SparCard[]]));
  const order = playerIds.map((_, i) => playerIds[(dealerSeat + 1 + i) % playerIds.length]);
  let offset = 0;
  for (const batch of [3, 2]) {
    for (const id of order) {
      hands[id].push(...deck.slice(offset, offset + batch));
      offset += batch;
    }
  }
  return { hands, remaining: [...deck.slice(offset)] };
}

export function legalSparCards(hand: readonly SparCard[], leading: SparSuit | null): SparCard[] {
  if (!leading) return [...hand];
  const matching = hand.filter((card) => sparSuit(card) === leading);
  return matching.length ? matching : [...hand];
}

export function resolveSparTrick(plays: readonly SparTrickPlay[]): {
  winnerPlayerId: string; winningCard: SparCard; leadSuit: SparSuit;
} {
  if (!plays.length) throw new Error("Cannot resolve an empty Spar trick.");
  const leading = sparSuit(plays[0].card);
  const eligible = plays.filter((play) => sparSuit(play.card) === leading);
  const highest = eligible.reduce((best, play) => sparValue(play.card) > sparValue(best.card) ? play : best);
  return { winnerPlayerId: highest.playerId, winningCard: highest.card, leadSuit: leading };
}

/** AI only sees its own hand, the current public trick, and its turn number. */
export function chooseSparAiCard(
  hand: readonly SparCard[], leading: SparSuit | null, trickNumber: number,
  difficulty: "easy" | "normal" | "hard",
): SparCard {
  const legal = legalSparCards(hand, leading);
  if (!legal.length) throw new Error("No legal Spar cards available.");
  if (difficulty === "easy") return legal[randomInt(legal.length)];
  const ordered = [...legal].sort((a, b) => sparValue(a) - sparValue(b));
  if (trickNumber < SPAR_TRICKS_PER_HAND) {
    // Save lower cards for a potentially higher scoring final trick.
    return difficulty === "hard" ? ordered[ordered.length - 1] : ordered[0];
  }
  // On the last trick, favor low winning ranks when the AI leads.
  return difficulty === "hard" ? ordered[0] : ordered[ordered.length - 1];
}
