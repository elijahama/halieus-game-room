import megaBoardIcon from "../../assets/game-icons/mega-board.svg";
import ludoIcon from "../../assets/game-icons/ludo.svg";
import connectFourIcon from "../../assets/game-icons/connect-four.svg";
import ayoIcon from "../../assets/game-icons/ayo.svg";
import wordBoardIcon from "../../assets/game-icons/word-board.svg";
import pokerIcon from "../../assets/game-icons/poker.svg";
import whotIcon from "../../assets/game-icons/whot.svg";
import blackjackIcon from "../../assets/game-icons/blackjack.svg";
import hiddenDictatorIcon from "../../assets/game-icons/hidden-dictator.svg";
import wordGameIcon from "../../assets/game-icons/word-game.svg";
import passwordIcon from "../../assets/game-icons/password.svg";
import anagramsRaceIcon from "../../assets/game-icons/anagrams-race.svg";
import cheatIcon from "../../assets/game-icons/cheat.svg";
import dominoesIcon from "../../assets/game-icons/dominoes.svg";

export type GameId = "mega-board" | "poker" | "blackjack" | "whot" | "ludo" | "hidden-dictator" | "connect-four" | "word-game" | "password" | "anagrams-race" | "cheat" | "dominoes" | "ayo" | "word-board";
export type GameCategory = "board" | "cards" | "social";

export interface GameCatalogEntry {
  id: GameId;
  name: string;
  subtitle: string;
  icon: string;
  accent: string;
  tone: string;
  motifs: string[];
  category: GameCategory;
  status?: "live" | "beta" | "retired";
}

export const GAME_CATALOG: GameCatalogEntry[] = [
  { id: "mega-board", name: "Mega Board", subtitle: "Build · Trade · Dominate", icon: megaBoardIcon, accent: "#16a34a", tone: "mega", motifs: ["⚄", "⌂", "£", "◆", "▣", "↗"], category: "board", status: "live" },
  { id: "ludo", name: "Ludo", subtitle: "Race to home", icon: ludoIcon, accent: "#d97706", tone: "ludo", motifs: ["●", "⚄", "↗", "★", "◎", "◆"], category: "board", status: "live" },
  { id: "connect-four", name: "Connect Four", subtitle: "Four in a row", icon: connectFourIcon, accent: "#2563eb", tone: "connect", motifs: ["●", "●", "●", "●", "↘", "◎"], category: "board", status: "live" },
  { id: "ayo", name: "Ayo", subtitle: "Traditional Yoruba seed game", icon: ayoIcon, accent: "#b87938", tone: "ayo", motifs: ["●", "●", "↻", "6", "6", "◆"], category: "board", status: "live" },
  { id: "word-board", name: "Word Board", subtitle: "Build words · Claim the board", icon: wordBoardIcon, accent: "#5b79a6", tone: "word-board", motifs: ["W", "O", "R", "D", "★", "×2"], category: "board", status: "live" },
  { id: "poker", name: "Poker", subtitle: "Texas Hold’em", icon: pokerIcon, accent: "#be123c", tone: "poker", motifs: ["♠", "♥", "♦", "♣", "●", "A"], category: "cards", status: "live" },
  { id: "whot", name: "WHOT", subtitle: "Classic shedding · Action cards", icon: whotIcon, accent: "#8b1e2d", tone: "whot", motifs: ["★", "●", "+", "△", "20", "W"], category: "cards", status: "live" },
  { id: "blackjack", name: "Blackjack", subtitle: "Dealer table · Hit to 21", icon: blackjackIcon, accent: "#2563eb", tone: "blackjack", motifs: ["A", "K", "♠", "♦", "21", "●"], category: "cards", status: "live" },
  { id: "hidden-dictator", name: "Hidden Dictator", subtitle: "Read the room · Hide your role", icon: hiddenDictatorIcon, accent: "#ea580c", tone: "dictator", motifs: ["◉", "?", "✓", "✕", "◆", "●"], category: "social", status: "beta" },
  { id: "word-game", name: "Word Game", subtitle: "Six guesses · Five letters", icon: wordGameIcon, accent: "#2563eb", tone: "word", motifs: ["W", "A", "R", "D", "✓", "?"], category: "social", status: "live" },
  { id: "password", name: "Password", subtitle: "One clue · One hidden word", icon: passwordIcon, accent: "#7c3aed", tone: "password", motifs: ["#", "?", "●", "→", "!", "P"], category: "social", status: "live" },
  { id: "anagrams-race", name: "Anagrams Race", subtitle: "Unscramble before the room", icon: anagramsRaceIcon, accent: "#ea580c", tone: "anagram", motifs: ["A", "↻", "R", "!", "G", "→"], category: "social", status: "live" },
  { id: "cheat", name: "Cheat", subtitle: "Bluff · Challenge · Survive", icon: cheatIcon, accent: "#db2777", tone: "cheat", motifs: ["?", "♠", "!", "♦", "×", "A"], category: "cards", status: "live" },
  { id: "dominoes", name: "Dominoes", subtitle: "Match the ends", icon: dominoesIcon, accent: "#0f766e", tone: "dominoes", motifs: ["●", "│", "●", "◆", "↔", "6"], category: "board", status: "live" },
];

export const ACTIVE_GAME_CATALOG = GAME_CATALOG.filter((game) => game.status !== "retired");
export const ACTIVE_GAME_IDS = new Set<GameId>(ACTIVE_GAME_CATALOG.map((game) => game.id));

/** Roadmap-only titles. Not in GAME_CATALOG, ACTIVE_GAME_IDS or any room selector. */
export const FUTURE_GAME_QUEUE = [
  { name: "Tic-Tac-Toe", subtitle: "Noughts and Crosses · 3×3 / 4×4 / 5×5 · Casual / Ranked", glyph: "×", stage: "Rules foundation" },
  { name: "Villagers & Mafia", subtitle: "Social deduction", glyph: "◉", stage: "Planned" },
  { name: "Settlers", subtitle: "Original HGR settlement & trading", glyph: "⌂", stage: "Planned" },
  { name: "Spot the Match", subtitle: "Fast visual matching", glyph: "◎", stage: "Planned" },
] as const;

/** Variants of an existing playable game, not independent game engines or rooms. */
export const FUTURE_POKER_VARIANTS = [
  { name: "Omaha", subtitle: "Poker variant · Separate engine and QA pending", glyph: "♠" },
  { name: "Five-Card Draw", subtitle: "Poker variant · Separate engine and QA pending", glyph: "♦" },
  { name: "Seven-Card Stud", subtitle: "Poker variant · Separate engine and QA pending", glyph: "♣" },
] as const;

export const GAME_BY_ID = Object.fromEntries(GAME_CATALOG.map((game) => [game.id, game])) as Record<GameId, GameCatalogEntry>;
