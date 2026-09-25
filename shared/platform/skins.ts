import type { HalieusGameStatLine, HalieusPersonalStats } from "./accounts.js";

export type HalieusSkinSlot = "interface" | "cards" | "mega-board" | "poker-table";
export type HalieusSkinCollection = "core" | "retro" | "competitive" | "prestige" | "event";

export type HalieusGameRatings = Partial<Record<HalieusGameStatLine["game"], number>>;

export interface HalieusSkinUnlockContext {
  stats: HalieusPersonalStats;
  ratings?: HalieusGameRatings;
  achievements?: readonly string[];
  guildMilestones?: readonly string[];
  seasonalFlags?: readonly string[];
}

export interface HalieusSkinUnlock {
  kind: "starter" | "played" | "wins" | "rating" | "achievement" | "guild" | "seasonal";
  count?: number;
  game?: HalieusGameStatLine["game"];
  games?: HalieusGameStatLine["game"][];
  rating?: number;
  key?: string;
  label: string;
}

export interface HalieusSkinDefinition {
  id: string;
  slot: HalieusSkinSlot;
  label: string;
  description: string;
  mood: string;
  collection: HalieusSkinCollection;
  /** Four-colour identity used by compact cosmetic previews. */
  previewPalette?: readonly [string, string, string, string];
  unlock: HalieusSkinUnlock;
}

export interface HalieusSkinPreferences {
  interface: string;
  cards: string;
  "mega-board": string;
  "poker-table": string;
}

export const SKIN_CATALOG: readonly HalieusSkinDefinition[] = [
  { id: "negotiator-board", slot: "mega-board", label: "Negotiator", description: "Brass lanes and deep ink framing earned by initiating a completed three-way deal.", mood: "Diplomat", collection: "prestige", previewPalette: ["#17130e","#2a2116","#c69a48","#594225"], unlock: { kind: "achievement", key: "mega:three-way", label: "Initiate a completed three-way deal" } },
  { id: "kass-board", slot: "mega-board", label: "Birthday Circuit", description: "Warm celebratory board framing for five lifetime Kass Maneuvers.", mood: "Celebration", collection: "prestige", previewPalette: ["#2d1718","#4a2224","#e9b748","#d35b67"], unlock: { kind: "achievement", key: "mega:kass-five", label: "Perform five Kass Maneuvers" } },
  { id: "royal-table", slot: "poker-table", label: "Royal Table", description: "Violet felt and gold trim earned by winning with a royal flush.", mood: "Royal", collection: "prestige", unlock: { kind: "achievement", key: "poker:royal-flush", label: "Win with a royal flush" } },
  { id: "veteran-deck", slot: "cards", label: "Active Player Deck", description: "An engraved navy-and-silver card back for an hour of active play.", mood: "Veteran", collection: "prestige", unlock: { kind: "achievement", key: "active-hour", label: "One hour of active play" } },
  { id: "standard-shell", slot: "interface", label: "Standard Shell", description: "The canonical HGR frame.", mood: "Core", collection: "core", unlock: { kind: "starter", label: "Starter" } },
  { id: "carbon-shell", slot: "interface", label: "Carbon Shell", description: "Tighter edges and deeper instrument-panel framing.", mood: "Technical", collection: "competitive", unlock: { kind: "played", count: 5, label: "Play 5 games" } },
  { id: "arcade-shell", slot: "interface", label: "Arcade Shell", description: "Chunkier controls and a cabinet-style edge treatment.", mood: "Arcade", collection: "retro", unlock: { kind: "played", count: 15, label: "Play 15 games" } },
  { id: "champion-shell", slot: "interface", label: "Champion Trim", description: "A restrained metallic victory trim for the platform shell.", mood: "Prestige", collection: "prestige", unlock: { kind: "wins", count: 10, label: "Win 10 games" } },

  { id: "classic-deck", slot: "cards", label: "Classic Deck", description: "Clean HGR card backs and neutral table treatment.", mood: "Core", collection: "core", unlock: { kind: "starter", label: "Starter" } },
  { id: "midnight-deck", slot: "cards", label: "Midnight Deck", description: "Dark geometric card backs with cool highlights.", mood: "Night", collection: "competitive", unlock: { kind: "played", count: 5, games: ["poker", "blackjack", "whot"], label: "Play 5 card games" } },
  { id: "casino-deck", slot: "cards", label: "Casino Deck", description: "Deep felt backs with a subtle gold centre mark.", mood: "Casino", collection: "prestige", unlock: { kind: "wins", count: 5, games: ["poker", "blackjack", "whot"], label: "Win 5 card games" } },
  { id: "neon-deck", slot: "cards", label: "Neon Deck", description: "High-energy cyan/magenta edge treatment.", mood: "Arcade", collection: "retro", unlock: { kind: "played", count: 20, games: ["poker", "blackjack", "whot"], label: "Play 20 card games" } },

  { id: "classic-board", slot: "mega-board", label: "Classic Board", description: "The standard Mega Board table.", mood: "Core", collection: "core", previewPalette: ["#efe4c4","#d7c69c","#15803d","#c59a45"], unlock: { kind: "starter", label: "Starter" } },
  { id: "muted-tournament-board", slot: "mega-board", label: "Muted Tournament", description: "Lower saturation, quieter materials and a competitive table-room finish.", mood: "Tournament", collection: "competitive", previewPalette: ["#c9c2ae","#a9a28f","#52665c","#8a7b5d"], unlock: { kind: "starter", label: "Starter alternative" } },
  { id: "night-board", slot: "mega-board", label: "Night Board", description: "A darker property field with illuminated board lanes.", mood: "Night", collection: "competitive", previewPalette: ["#111d27","#1c2e3b","#3778aa","#d4b35d"], unlock: { kind: "played", count: 3, games: ["mega-board"], label: "Play 3 Mega Board games" } },
  { id: "transit-board", slot: "mega-board", label: "Transit Board", description: "Map-inspired board framing and transport-line accents.", mood: "Metro", collection: "core", previewPalette: ["#18221f","#18312f","#2f9bb1","#e09b37"], unlock: { kind: "played", count: 10, games: ["mega-board"], label: "Play 10 Mega Board games" } },
  { id: "tycoon-board", slot: "mega-board", label: "Tycoon Board", description: "Black, brass and restrained premium board framing.", mood: "Prestige", collection: "prestige", previewPalette: ["#171510","#282319","#d3a649","#6f5b32"], unlock: { kind: "wins", count: 5, games: ["mega-board"], label: "Win 5 Mega Board games" } },
  { id: "ivory-8bit-board", slot: "mega-board", label: "8-bit Ivory", description: "Warm ivory, deep red and charcoal inspired by early home-console hardware.", mood: "Retro 8-bit", collection: "retro", previewPalette: ["#d8d2c3","#f0ece2","#a72e35","#c59a45"], unlock: { kind: "played", count: 5, games: ["mega-board"], label: "Play 5 Mega Board games" } },
  { id: "lavender-16bit-board", slot: "mega-board", label: "16-bit Lavender", description: "Soft greys and lavender accents with a friendly 16-bit-era hardware feel.", mood: "Retro 16-bit", collection: "retro", previewPalette: ["#c7c6c9","#e2e1e3","#7566a8","#9f87c3"], unlock: { kind: "wins", count: 3, games: ["mega-board"], label: "Win 3 Mega Board games" } },
  { id: "black-drive-board", slot: "mega-board", label: "Black Drive", description: "Black graphite, restrained red and metallic grey for a sharper arcade-console mood.", mood: "Retro Drive", collection: "retro", previewPalette: ["#08090b","#17191d","#c43138","#8e99a5"], unlock: { kind: "played", count: 12, games: ["mega-board"], label: "Play 12 Mega Board games" } },
  { id: "grey-disc-board", slot: "mega-board", label: "Grey Disc", description: "Cool grey hardware tones with muted blue and primary-colour detail.", mood: "Retro Disc", collection: "retro", previewPalette: ["#bfc1c3","#dedfe0","#3f6597","#b04d52"], unlock: { kind: "rating", game: "mega-board", rating: 1200, label: "Reach 1200 Mega Board rating" } },

  { id: "classic-felt", slot: "poker-table", label: "Classic Felt", description: "The current Poker table treatment.", mood: "Core", collection: "core", unlock: { kind: "starter", label: "Starter" } },
  { id: "muted-poker-room", slot: "poker-table", label: "Muted Poker Room", description: "Lower-saturation felt, rail and side-panel accents for a calmer table.", mood: "Tournament", collection: "competitive", unlock: { kind: "starter", label: "Starter alternative" } },
  { id: "ivory-8bit-table", slot: "poker-table", label: "8-bit Ivory", description: "Warm ivory and red hardware tones translated to the Poker room.", mood: "Retro 8-bit", collection: "retro", unlock: { kind: "played", count: 5, games: ["poker"], label: "Play 5 Poker games" } },
  { id: "lavender-16bit-table", slot: "poker-table", label: "16-bit Lavender", description: "Grey and lavender table materials with restrained playful accents.", mood: "Retro 16-bit", collection: "retro", unlock: { kind: "wins", count: 3, games: ["poker"], label: "Win 3 Poker games" } },
  { id: "black-drive-table", slot: "poker-table", label: "Black Drive", description: "Graphite-black felt surrounds with red and steel instrumentation.", mood: "Retro Drive", collection: "retro", unlock: { kind: "played", count: 12, games: ["poker"], label: "Play 12 Poker games" } },
  { id: "grey-disc-table", slot: "poker-table", label: "Grey Disc", description: "Cool grey table framing with understated blue and primary accents.", mood: "Retro Disc", collection: "retro", unlock: { kind: "wins", count: 8, games: ["poker"], label: "Win 8 Poker games" } },
] as const;

export const DEFAULT_SKIN_PREFERENCES: HalieusSkinPreferences = {
  interface: "standard-shell",
  cards: "classic-deck",
  "mega-board": "classic-board",
  "poker-table": "classic-felt",
};

function totalFor(stats: HalieusPersonalStats, games: HalieusGameStatLine["game"][] | undefined, field: "played" | "wins"): number {
  if (!games?.length) return field === "played" ? stats.played : stats.wins;
  const selected = new Set(games);
  return stats.byGame.filter((line) => selected.has(line.game)).reduce((sum, line) => sum + line[field], 0);
}

export function isSkinUnlocked(skin: HalieusSkinDefinition, context: HalieusSkinUnlockContext, betaMode: boolean): boolean {
  if (betaMode) return true;
  const unlock = skin.unlock;
  if (unlock.kind === "starter") return true;
  if (unlock.kind === "played" || unlock.kind === "wins") {
    return totalFor(context.stats, unlock.games, unlock.kind) >= (unlock.count ?? 0);
  }
  if (unlock.kind === "rating") {
    if (!unlock.game || !Number.isFinite(unlock.rating)) return false;
    return (context.ratings?.[unlock.game] ?? 0) >= (unlock.rating ?? Infinity);
  }
  if (unlock.kind === "achievement") return Boolean(unlock.key && context.achievements?.includes(unlock.key));
  if (unlock.kind === "guild") return Boolean(unlock.key && context.guildMilestones?.includes(unlock.key));
  if (unlock.kind === "seasonal") return Boolean(unlock.key && context.seasonalFlags?.includes(unlock.key));
  return false;
}

export function skinsForSlot(slot: HalieusSkinSlot): HalieusSkinDefinition[] {
  return SKIN_CATALOG.filter((skin) => skin.slot === slot);
}

function validFor(slot: HalieusSkinSlot, id: unknown): id is string {
  return typeof id === "string" && SKIN_CATALOG.some((skin) => skin.slot === slot && skin.id === id);
}
