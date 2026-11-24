/** Browser-safe subset of the Spar rules (no Node.js crypto dependency).
 * Server independently validates every move using the authoritative engine. */
import type { SparCard, SparRank, SparSuit } from "./types";
export function sparSuit(card: SparCard): SparSuit {
  return card.slice(-1) as SparSuit;
}
export function sparRank(card: SparCard): SparRank {
  return card.slice(0,-1) as SparRank;
}
export function legalSparCards(hand: readonly SparCard[], leading: SparSuit | null): SparCard[] {
  if(!leading) return [...hand];
  const sameSuit=hand.filter(card=>sparSuit(card)===leading);
  return sameSuit.length ? sameSuit : [...hand];
}
