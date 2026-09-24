import type { HalieusGameStatLine, HalieusPersonalStats } from "../../../shared/platform/accounts";

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
  unlock: HalieusSkinUnlock;
}

export interface HalieusSkinPreferences {
  interface: string;
  cards: string;
  "mega-board": string;
  "poker-table": string;
}

export const SKIN_PREFERENCES_KEY = "halieus-game-room-skins";
export const BETA_SKIN_PREVIEW_KEY = "halieus-beta-skin-preview";

export const SKIN_CATALOG: readonly HalieusSkinDefinition[] = [
  { id: "standard-shell", slot: "interface", label: "Standard Shell", description: "The canonical HGR frame.", mood: "Core", collection: "core", unlock: { kind: "starter", label: "Starter" } },
  { id: "carbon-shell", slot: "interface", label: "Carbon Shell", description: "Tighter edges and deeper instrument-panel framing.", mood: "Technical", collection: "competitive", unlock: { kind: "played", count: 5, label: "Play 5 games" } },
  { id: "arcade-shell", slot: "interface", label: "Arcade Shell", description: "Chunkier controls and a cabinet-style edge treatment.", mood: "Arcade", collection: "retro", unlock: { kind: "played", count: 15, label: "Play 15 games" } },
  { id: "champion-shell", slot: "interface", label: "Champion Trim", description: "A restrained metallic victory trim for the platform shell.", mood: "Prestige", collection: "prestige", unlock: { kind: "wins", count: 10, label: "Win 10 games" } },

  { id: "classic-deck", slot: "cards", label: "Classic Deck", description: "Clean HGR card backs and neutral table treatment.", mood: "Core", collection: "core", unlock: { kind: "starter", label: "Starter" } },
  { id: "midnight-deck", slot: "cards", label: "Midnight Deck", description: "Dark geometric card backs with cool highlights.", mood: "Night", collection: "competitive", unlock: { kind: "played", count: 5, games: ["poker", "blackjack", "whot"], label: "Play 5 card games" } },
  { id: "casino-deck", slot: "cards", label: "Casino Deck", description: "Deep felt backs with a subtle gold centre mark.", mood: "Casino", collection: "prestige", unlock: { kind: "wins", count: 5, games: ["poker", "blackjack", "whot"], label: "Win 5 card games" } },
  { id: "neon-deck", slot: "cards", label: "Neon Deck", description: "High-energy cyan/magenta edge treatment.", mood: "Arcade", collection: "retro", unlock: { kind: "played", count: 20, games: ["poker", "blackjack", "whot"], label: "Play 20 card games" } },

  { id: "classic-board", slot: "mega-board", label: "Classic Board", description: "The standard Mega Board table.", mood: "Core", collection: "core", unlock: { kind: "starter", label: "Starter" } },
  { id: "muted-tournament-board", slot: "mega-board", label: "Muted Tournament", description: "Lower saturation, quieter materials and a competitive table-room finish.", mood: "Tournament", collection: "competitive", unlock: { kind: "starter", label: "Starter alternative" } },
  { id: "night-board", slot: "mega-board", label: "Night Board", description: "A darker property field with illuminated board lanes.", mood: "Night", collection: "competitive", unlock: { kind: "played", count: 3, games: ["mega-board"], label: "Play 3 Mega Board games" } },
  { id: "transit-board", slot: "mega-board", label: "Transit Board", description: "Map-inspired board framing and transport-line accents.", mood: "Metro", collection: "core", unlock: { kind: "played", count: 10, games: ["mega-board"], label: "Play 10 Mega Board games" } },
  { id: "tycoon-board", slot: "mega-board", label: "Tycoon Board", description: "Black, brass and restrained premium board framing.", mood: "Prestige", collection: "prestige", unlock: { kind: "wins", count: 5, games: ["mega-board"], label: "Win 5 Mega Board games" } },
  { id: "ivory-8bit-board", slot: "mega-board", label: "8-bit Ivory", description: "Warm ivory, deep red and charcoal inspired by early home-console hardware.", mood: "Retro 8-bit", collection: "retro", unlock: { kind: "played", count: 5, games: ["mega-board"], label: "Play 5 Mega Board games" } },
  { id: "lavender-16bit-board", slot: "mega-board", label: "16-bit Lavender", description: "Soft greys and lavender accents with a friendly 16-bit-era hardware feel.", mood: "Retro 16-bit", collection: "retro", unlock: { kind: "wins", count: 3, games: ["mega-board"], label: "Win 3 Mega Board games" } },
  { id: "black-drive-board", slot: "mega-board", label: "Black Drive", description: "Black graphite, restrained red and metallic grey for a sharper arcade-console mood.", mood: "Retro Drive", collection: "retro", unlock: { kind: "played", count: 12, games: ["mega-board"], label: "Play 12 Mega Board games" } },
  { id: "grey-disc-board", slot: "mega-board", label: "Grey Disc", description: "Cool grey hardware tones with muted blue and primary-colour detail.", mood: "Retro Disc", collection: "retro", unlock: { kind: "rating", game: "mega-board", rating: 1200, label: "Reach 1200 Mega Board rating" } },

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

export function readSkinPreferences(): HalieusSkinPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(SKIN_PREFERENCES_KEY) ?? "{}") as Partial<HalieusSkinPreferences>;
    return {
      interface: validFor("interface", parsed.interface) ? parsed.interface : DEFAULT_SKIN_PREFERENCES.interface,
      cards: validFor("cards", parsed.cards) ? parsed.cards : DEFAULT_SKIN_PREFERENCES.cards,
      "mega-board": validFor("mega-board", parsed["mega-board"]) ? parsed["mega-board"] : DEFAULT_SKIN_PREFERENCES["mega-board"],
      "poker-table": validFor("poker-table", parsed["poker-table"]) ? parsed["poker-table"] : DEFAULT_SKIN_PREFERENCES["poker-table"],
    };
  } catch {
    return { ...DEFAULT_SKIN_PREFERENCES };
  }
}

export function readBetaSkinPreferences(): HalieusSkinPreferences {
  try {
    const base = readSkinPreferences();
    const parsed = JSON.parse(sessionStorage.getItem(BETA_SKIN_PREVIEW_KEY) ?? "{}") as Partial<HalieusSkinPreferences>;
    return {
      interface: validFor("interface", parsed.interface) ? parsed.interface : base.interface,
      cards: validFor("cards", parsed.cards) ? parsed.cards : base.cards,
      "mega-board": validFor("mega-board", parsed["mega-board"]) ? parsed["mega-board"] : base["mega-board"],
      "poker-table": validFor("poker-table", parsed["poker-table"]) ? parsed["poker-table"] : base["poker-table"],
    };
  } catch {
    return readSkinPreferences();
  }
}

export function readEffectiveSkinPreferences(betaMode: boolean): HalieusSkinPreferences {
  return betaMode ? readBetaSkinPreferences() : readSkinPreferences();
}

function unlockContextIsKnown(skin: HalieusSkinDefinition, context: HalieusSkinUnlockContext): boolean {
  const unlock = skin.unlock;
  if (unlock.kind === "starter" || unlock.kind === "played" || unlock.kind === "wins") return true;
  if (unlock.kind === "rating") return Boolean(unlock.game && context.ratings?.[unlock.game] !== undefined);
  if (unlock.kind === "achievement") return context.achievements !== undefined;
  if (unlock.kind === "guild") return context.guildMilestones !== undefined;
  if (unlock.kind === "seasonal") return context.seasonalFlags !== undefined;
  return false;
}

export function sanitiseSkinPreferences(
  preferences: HalieusSkinPreferences,
  context: HalieusSkinUnlockContext,
  betaMode: boolean,
): HalieusSkinPreferences {
  const next = { ...preferences };
  for (const slot of ["interface", "cards", "mega-board", "poker-table"] as HalieusSkinSlot[]) {
    const selected = SKIN_CATALOG.find((skin) => skin.slot === slot && skin.id === preferences[slot]);
    if (!selected) {
      next[slot] = DEFAULT_SKIN_PREFERENCES[slot];
      continue;
    }
    if (!betaMode && unlockContextIsKnown(selected, context) && !isSkinUnlocked(selected, context, false)) {
      next[slot] = DEFAULT_SKIN_PREFERENCES[slot];
    }
  }
  return next;
}

export function saveSkinPreference(slot: HalieusSkinSlot, id: string, betaMode = false): HalieusSkinPreferences {
  if (!validFor(slot, id)) return readEffectiveSkinPreferences(betaMode);
  const current = readEffectiveSkinPreferences(betaMode);
  const next = { ...current, [slot]: id };
  if (betaMode) sessionStorage.setItem(BETA_SKIN_PREVIEW_KEY, JSON.stringify(next));
  else localStorage.setItem(SKIN_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<HalieusSkinPreferences>("halieus-skins-change", { detail: next }));
  return next;
}

export function saveSkinPreferences(preferences: HalieusSkinPreferences, betaMode = false): void {
  if (betaMode) sessionStorage.setItem(BETA_SKIN_PREVIEW_KEY, JSON.stringify(preferences));
  else localStorage.setItem(SKIN_PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent<HalieusSkinPreferences>("halieus-skins-change", { detail: preferences }));
}

export function clearBetaSkinPreview(): void {
  sessionStorage.removeItem(BETA_SKIN_PREVIEW_KEY);
}
