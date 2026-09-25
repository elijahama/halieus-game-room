export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";
export type AchievementCategory = "general" | "exploration" | "time" | "game" | "special";
export type AchievementCounter =
  | "played"
  | "wins"
  | "distinct-games"
  | "active-minutes"
  | "game-played"
  | "game-wins"
  | "kass-maneuvers"
  | "completed-trades"
  | "special";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  requirement: string;
  points: number;
  tier: AchievementTier;
  category: AchievementCategory;
  counter: AchievementCounter;
  target: number;
  game?: string;
}

export interface AchievementAward {
  id: string;
  title: string;
  points: number;
  earnedAt: number;
  sessionId: string;
}

export interface AchievementProgress {
  id: string;
  title: string;
  description: string;
  requirement: string;
  points: number;
  tier: AchievementTier;
  category: AchievementCategory;
  game?: string;
  current: number;
  target: number;
  earned: boolean;
  earnedAt: number | null;
}

export interface PlayerProgression {
  gamerScore: number;
  maxGamerScore: number;
  activePlayMs: number;
  played: number;
  wins: number;
  awards: AchievementAward[];
  achievements: AchievementProgress[];
  byGame: Record<string, { played: number; wins: number }>;
}

export const PROGRESSION_GAMES = [
  ["mega-board", "Mega Board"],
  ["poker", "Poker"],
  ["blackjack", "Blackjack"],
  ["whot", "WHOT"],
  ["ludo", "Ludo"],
  ["connect-four", "Connect Four"],
  ["ayo", "Ayo"],
  ["word-board", "Word Board"],
  ["word-game", "Word Game"],
  ["password", "Password"],
  ["anagrams-race", "Anagrams Race"],
  ["cheat", "Cheat"],
  ["dominoes", "Dominoes"],
  ["hidden-dictator", "Hidden Dictator"],
] as const;

const coreAchievements: AchievementDefinition[] = [
  { id:"first-match", title:"First Steps", description:"Finish your first verified HGR match.", requirement:"Complete 1 verified non-Beta match", points:10, tier:"bronze", category:"general", counter:"played", target:1 },
  { id:"five-matches", title:"Getting Settled", description:"Build a small history across HGR.", requirement:"Complete 5 verified matches", points:20, tier:"bronze", category:"general", counter:"played", target:5 },
  { id:"twenty-five-matches", title:"Regular at the Table", description:"A sustained record of completed play.", requirement:"Complete 25 verified matches", points:50, tier:"silver", category:"general", counter:"played", target:25 },
  { id:"fifty-matches", title:"Game Room Veteran", description:"A deep account-wide history of completed games.", requirement:"Complete 50 verified matches", points:100, tier:"gold", category:"general", counter:"played", target:50 },

  { id:"five-wins", title:"Winning Ways", description:"Turn completed matches into results.", requirement:"Win 5 verified matches", points:30, tier:"bronze", category:"general", counter:"wins", target:5 },
  { id:"ten-wins", title:"Proven Winner", description:"Reach double figures in account-wide wins.", requirement:"Win 10 verified matches", points:60, tier:"silver", category:"general", counter:"wins", target:10 },
  { id:"twenty-five-wins", title:"Hall Regular", description:"Accumulate a substantial win record.", requirement:"Win 25 verified matches", points:120, tier:"gold", category:"general", counter:"wins", target:25 },

  { id:"three-games", title:"Try the Room", description:"Branch out beyond one title.", requirement:"Complete a match in 3 different HGR games", points:25, tier:"bronze", category:"exploration", counter:"distinct-games", target:3 },
  { id:"five-games", title:"Game Room Explorer", description:"Build a record across five different games.", requirement:"Complete a match in 5 different HGR games", points:50, tier:"silver", category:"exploration", counter:"distinct-games", target:5 },
  { id:"ten-games", title:"Across the Room", description:"Experience most of the HGR catalogue.", requirement:"Complete a match in 10 different HGR games", points:100, tier:"gold", category:"exploration", counter:"distinct-games", target:10 },

  { id:"active-hour", title:"Active Hour", description:"Spend one verified hour actively making game actions.", requirement:"Accumulate 60 minutes of active play", points:50, tier:"silver", category:"time", counter:"active-minutes", target:60 },
  { id:"active-five-hours", title:"Session Regular", description:"Build five hours of verified active play.", requirement:"Accumulate 300 minutes of active play", points:100, tier:"gold", category:"time", counter:"active-minutes", target:300 },
  { id:"active-ten-hours", title:"Game Room Fixture", description:"Reach ten hours of verified active play.", requirement:"Accumulate 600 minutes of active play", points:150, tier:"platinum", category:"time", counter:"active-minutes", target:600 },

  { id:"mega:kass-one", title:"Kass Maneuver", description:"Complete the Birthday Gift ↔ GO maneuver once.", requirement:"Perform 1 Kass Maneuver in Mega Board", points:20, tier:"bronze", category:"special", counter:"kass-maneuvers", target:1, game:"mega-board" },
  { id:"mega:kass-five", title:"Kass Specialist", description:"Repeat the Birthday Gift ↔ GO maneuver five times across verified play.", requirement:"Perform 5 lifetime Kass Maneuvers", points:75, tier:"gold", category:"special", counter:"kass-maneuvers", target:5, game:"mega-board" },
  { id:"mega:kass-fifteen", title:"Kass Master", description:"Make the Kass Maneuver a signature move.", requirement:"Perform 15 lifetime Kass Maneuvers", points:150, tier:"platinum", category:"special", counter:"kass-maneuvers", target:15, game:"mega-board" },

  { id:"mega:first-trade", title:"Deal Maker", description:"Complete your first successful Mega Board trade.", requirement:"Complete 1 Mega Board trade", points:20, tier:"bronze", category:"special", counter:"completed-trades", target:1, game:"mega-board" },
  { id:"mega:five-trades", title:"Negotiator", description:"Build a verified history of successful trading.", requirement:"Complete 5 Mega Board trades", points:50, tier:"silver", category:"special", counter:"completed-trades", target:5, game:"mega-board" },
  { id:"mega:twenty-trades", title:"Market Maker", description:"Become a prolific Mega Board trader.", requirement:"Complete 20 Mega Board trades", points:125, tier:"gold", category:"special", counter:"completed-trades", target:20, game:"mega-board" },

  { id:"mega:three-way", title:"Three-Way Negotiator", description:"Initiate a completed three-player deal.", requirement:"Initiate 1 completed three-way Mega Board deal", points:40, tier:"silver", category:"special", counter:"special", target:1, game:"mega-board" },
  { id:"connect-four:clean-sweep", title:"Clean Sweep", description:"Win a multi-round Connect Four series without conceding a round.", requirement:"Win a best-of-3 or best-of-5 series 2–0 or 3–0", points:40, tier:"silver", category:"special", counter:"special", target:1, game:"connect-four" },
  { id:"ludo:home-four", title:"Everybody Home", description:"Win Ludo with all four pieces home.", requirement:"Win with all 4 Ludo pieces home", points:40, tier:"silver", category:"special", counter:"special", target:1, game:"ludo" },
  { id:"poker:straight-flush", title:"Straight Flush", description:"Record a straight flush in verified Poker play.", requirement:"Make a straight flush in Poker", points:75, tier:"gold", category:"special", counter:"special", target:1, game:"poker" },
  { id:"poker:royal-flush", title:"Royal Flush", description:"Record Poker's rarest standard made hand.", requirement:"Make a royal flush in Poker", points:100, tier:"platinum", category:"special", counter:"special", target:1, game:"poker" },
];

const perGameAchievements: AchievementDefinition[] = PROGRESSION_GAMES.flatMap(([game, label]) => [
  { id:`${game}:first-match`, title:`${label} Debut`, description:`Complete your first verified ${label} match.`, requirement:`Complete 1 ${label} match`, points:10, tier:"bronze", category:"game", counter:"game-played", target:1, game } as AchievementDefinition,
  { id:`${game}:first-win`, title:`${label} First Win`, description:`Record your first verified ${label} win.`, requirement:`Win 1 ${label} match`, points:20, tier:"bronze", category:"game", counter:"game-wins", target:1, game } as AchievementDefinition,
  { id:`${game}:ten-matches`, title:`${label} Regular`, description:`Build a ten-match record in ${label}.`, requirement:`Complete 10 ${label} matches`, points:30, tier:"silver", category:"game", counter:"game-played", target:10, game } as AchievementDefinition,
  { id:`${game}:five-wins`, title:`${label} Specialist`, description:`Win five verified ${label} matches.`, requirement:`Win 5 ${label} matches`, points:50, tier:"gold", category:"game", counter:"game-wins", target:5, game } as AchievementDefinition,
]);

export const ACHIEVEMENT_CATALOG: readonly AchievementDefinition[] = [
  ...coreAchievements,
  ...perGameAchievements,
];

export function achievementDefinition(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_CATALOG.find((achievement) => achievement.id === id);
}

export const MAX_GAMER_SCORE = ACHIEVEMENT_CATALOG.reduce((sum, achievement) => sum + achievement.points, 0);
