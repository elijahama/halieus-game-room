export type HalieusRankedModel = "elo" | "series-elo" | "placement-rating" | "score-rating" | "daily-time";

export interface HalieusRankedFormat {
  game: string;
  model: HalieusRankedModel;
  label: string;
  summary: string;
  format: string;
  scoring: string;
  tieBreakers: string[];
  provisionalMatches: number;
}

export const HGR_RANKED_FORMATS: Record<string, HalieusRankedFormat> = {
  "mega-board": {
    game: "mega-board",
    model: "placement-rating",
    label: "Placement rating",
    summary: "Multiplayer results are evaluated by finishing position rather than pretending every table is a head-to-head duel.",
    format: "Human competitive tables. Larger tables create more placement comparisons in one result.",
    scoring: "Rating movement is based on who finishes above whom, with the winner receiving the strongest positive result.",
    tieBreakers: ["Rating", "Ranked wins", "Average finish", "Games played"],
    provisionalMatches: 5,
  },
  poker: {
    game: "poker",
    model: "placement-rating",
    label: "Tournament rating",
    summary: "Poker rank is based on competitive table finishes, not chip totals carried between unrelated rooms.",
    format: "Human ranked tables. Final table placement is the competitive result.",
    scoring: "Finishing above stronger opponents produces more rating value than beating lower-rated opposition.",
    tieBreakers: ["Rating", "Ranked wins", "Top-three finishes", "Games played"],
    provisionalMatches: 5,
  },
  "connect-four": {
    game: "connect-four",
    model: "series-elo",
    label: "Series rating",
    summary: "A single board is too volatile for Ranked. Competitive Connect Four is decided as a multi-round series.",
    format: "Human vs human · best-of-3 or best-of-5. Best-of-1 remains Casual only.",
    scoring: "The series win/loss drives rating. Round differential is retained as a secondary competitive statistic.",
    tieBreakers: ["Rating", "Series wins", "Round differential", "Series played"],
    provisionalMatches: 5,
  },
  ludo: {
    game: "ludo",
    model: "placement-rating",
    label: "Placement rating",
    summary: "Ludo is multiplayer, so Ranked compares each player's final placement rather than reducing the room to winner-versus-everyone.",
    format: "2–4 human players. AI seats are disabled in Ranked.",
    scoring: "Players gain or lose rating against every opponent they finish above or below. Table size is accounted for.",
    tieBreakers: ["Rating", "First-place finishes", "Average placement", "Games played"],
    provisionalMatches: 5,
  },
  ayo: {
    game: "ayo",
    model: "score-rating",
    label: "Duel rating",
    summary: "Ayo is a two-player strategy duel, so its Ranked model can use direct opponent rating cleanly.",
    format: "Human vs human · traditional HGR Ayo rules. AI seats are disabled in Ranked.",
    scoring: "Win, loss or draw drives rating. Captured-seed differential is kept as a tie-break statistic, not a substitute for winning.",
    tieBreakers: ["Rating", "Ranked wins", "Seed differential", "Games played"],
    provisionalMatches: 5,
  },
  "word-game": {
    game: "word-game",
    model: "daily-time",
    label: "Daily puzzle rank",
    summary: "The shared daily puzzle is ranked by completion quality rather than opponent Elo.",
    format: "One counted daily attempt per player.",
    scoring: "Solved status, guesses and solve time determine the daily order.",
    tieBreakers: ["Solved", "Fewer guesses", "Faster solve"],
    provisionalMatches: 1,
  },
};

export function rankedFormatFor(game: string): HalieusRankedFormat | null {
  return HGR_RANKED_FORMATS[game] ?? null;
}
