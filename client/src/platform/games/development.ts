import type { GameId } from "./catalog";

/** Internal release-readiness is not the same as catalogue availability or Ranked rating. */
export type GameMaturity = "unassessed" | "beta" | "needs-repair" | "release-candidate" | "stable" | "retired";

export interface GameDevelopmentRecord {
  /** Independent per-game version; never infer it from the HGR platform version. */
  version: string | null;
  maturity: GameMaturity;
  /** Date of a game-specific audited build/owner acceptance, if any. */
  verifiedAt: string | null;
  notes: string;
}

const UNASSESSED: GameDevelopmentRecord = {
  version: null,
  maturity: "unassessed",
  verifiedAt: null,
  notes: "Individual version and completion acceptance have not yet been audited.",
};

/** Every supported game has one explicit, independently reviewable entry. */
export const GAME_DEVELOPMENT: Record<GameId, GameDevelopmentRecord> = {
  "mega-board": { ...UNASSESSED },
  "poker": { ...UNASSESSED },
  "blackjack": { ...UNASSESSED },
  "whot": { ...UNASSESSED },
  "ludo": { ...UNASSESSED },
  "hidden-dictator": {
    ...UNASSESSED,
    maturity: "beta",
    notes: "Public catalogue marks this game Beta; final owner acceptance is pending.",
  },
  "connect-four": { ...UNASSESSED },
  "word-game": { ...UNASSESSED },
  "password": { ...UNASSESSED },
  "anagrams-race": { ...UNASSESSED },
  "cheat": { ...UNASSESSED },
  "dominoes": { ...UNASSESSED },
  "ayo": {
    ...UNASSESSED,
    maturity: "needs-repair",
    notes: "Owner-reported serious gameplay faults remain under review; do not report as stable.",
  },
  "word-board": { ...UNASSESSED },
};

export const GAME_MATURITY_LABEL: Record<GameMaturity, string> = {
  unassessed: "Not assessed",
  beta: "Beta",
  "needs-repair": "Needs repair",
  "release-candidate": "Release candidate",
  stable: "Stable — verified",
  retired: "Retired",
};
