import type { HalieusGameStatLine, HalieusPersonalStats } from "../../../shared/platform/accounts";

export type HalieusSkinSlot = "interface" | "cards" | "mega-board";

export interface HalieusSkinUnlock {
  kind: "starter" | "played" | "wins";
  count?: number;
  games?: HalieusGameStatLine["game"][];
  label: string;
}

export interface HalieusSkinDefinition {
  id: string;
  slot: HalieusSkinSlot;
  label: string;
  description: string;
  mood: string;
  unlock: HalieusSkinUnlock;
}

export interface HalieusSkinPreferences {
  interface: string;
  cards: string;
  "mega-board": string;
}

export const SKIN_PREFERENCES_KEY = "halieus-game-room-skins";
export const BETA_SKIN_PREVIEW_KEY = "halieus-beta-skin-preview";

export const SKIN_CATALOG: readonly HalieusSkinDefinition[] = [
  { id: "standard-shell", slot: "interface", label: "Standard Shell", description: "The canonical HGR frame.", mood: "Core", unlock: { kind: "starter", label: "Starter" } },
  { id: "carbon-shell", slot: "interface", label: "Carbon Shell", description: "Tighter edges and deeper instrument-panel framing.", mood: "Technical", unlock: { kind: "played", count: 5, label: "Play 5 games" } },
  { id: "arcade-shell", slot: "interface", label: "Arcade Shell", description: "Chunkier controls and a cabinet-style edge treatment.", mood: "Arcade", unlock: { kind: "played", count: 15, label: "Play 15 games" } },
  { id: "champion-shell", slot: "interface", label: "Champion Trim", description: "A restrained metallic victory trim for the platform shell.", mood: "Prestige", unlock: { kind: "wins", count: 10, label: "Win 10 games" } },

  { id: "classic-deck", slot: "cards", label: "Classic Deck", description: "Clean HGR card backs and neutral table treatment.", mood: "Core", unlock: { kind: "starter", label: "Starter" } },
  { id: "midnight-deck", slot: "cards", label: "Midnight Deck", description: "Dark geometric card backs with cool highlights.", mood: "Night", unlock: { kind: "played", count: 5, games: ["poker", "blackjack", "whot"], label: "Play 5 card games" } },
  { id: "casino-deck", slot: "cards", label: "Casino Deck", description: "Deep felt backs with a subtle gold centre mark.", mood: "Casino", unlock: { kind: "wins", count: 5, games: ["poker", "blackjack", "whot"], label: "Win 5 card games" } },
  { id: "neon-deck", slot: "cards", label: "Neon Deck", description: "High-energy cyan/magenta edge treatment.", mood: "Arcade", unlock: { kind: "played", count: 20, games: ["poker", "blackjack", "whot"], label: "Play 20 card games" } },

  { id: "classic-board", slot: "mega-board", label: "Classic Board", description: "The standard Mega Board table.", mood: "Core", unlock: { kind: "starter", label: "Starter" } },
  { id: "night-board", slot: "mega-board", label: "Night Board", description: "A darker property field with illuminated board lanes.", mood: "Night", unlock: { kind: "played", count: 3, games: ["mega-board"], label: "Play 3 Mega Board games" } },
  { id: "transit-board", slot: "mega-board", label: "Transit Board", description: "Map-inspired board framing and transport-line accents.", mood: "Metro", unlock: { kind: "played", count: 10, games: ["mega-board"], label: "Play 10 Mega Board games" } },
  { id: "tycoon-board", slot: "mega-board", label: "Tycoon Board", description: "Black, brass and restrained premium board framing.", mood: "Prestige", unlock: { kind: "wins", count: 5, games: ["mega-board"], label: "Win 5 Mega Board games" } },
] as const;

export const DEFAULT_SKIN_PREFERENCES: HalieusSkinPreferences = {
  interface: "standard-shell",
  cards: "classic-deck",
  "mega-board": "classic-board",
};

function totalFor(stats: HalieusPersonalStats, games: HalieusGameStatLine["game"][] | undefined, field: "played" | "wins"): number {
  if (!games?.length) return field === "played" ? stats.played : stats.wins;
  const selected = new Set(games);
  return stats.byGame.filter((line) => selected.has(line.game)).reduce((sum, line) => sum + line[field], 0);
}

export function isSkinUnlocked(skin: HalieusSkinDefinition, stats: HalieusPersonalStats, betaMode: boolean): boolean {
  if (betaMode) return true;
  if (skin.unlock.kind === "starter") return true;
  const field = skin.unlock.kind === "wins" ? "wins" : "played";
  return totalFor(stats, skin.unlock.games, field) >= (skin.unlock.count ?? 0);
}

export function skinsForSlot(slot: HalieusSkinSlot): HalieusSkinDefinition[] {
  return SKIN_CATALOG.filter((skin) => skin.slot === slot);
}

export function readSkinPreferences(): HalieusSkinPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(SKIN_PREFERENCES_KEY) ?? "{}") as Partial<HalieusSkinPreferences>;
    const validFor = (slot: HalieusSkinSlot, id: unknown) => typeof id === "string" && SKIN_CATALOG.some((skin) => skin.slot === slot && skin.id === id);
    return {
      interface: validFor("interface", parsed.interface) ? parsed.interface! : DEFAULT_SKIN_PREFERENCES.interface,
      cards: validFor("cards", parsed.cards) ? parsed.cards! : DEFAULT_SKIN_PREFERENCES.cards,
      "mega-board": validFor("mega-board", parsed["mega-board"]) ? parsed["mega-board"]! : DEFAULT_SKIN_PREFERENCES["mega-board"],
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
      interface: typeof parsed.interface === "string" ? parsed.interface : base.interface,
      cards: typeof parsed.cards === "string" ? parsed.cards : base.cards,
      "mega-board": typeof parsed["mega-board"] === "string" ? parsed["mega-board"] : base["mega-board"],
    };
  } catch {
    return readSkinPreferences();
  }
}

export function readEffectiveSkinPreferences(betaMode: boolean): HalieusSkinPreferences {
  return betaMode ? readBetaSkinPreferences() : readSkinPreferences();
}

export function saveSkinPreference(slot: HalieusSkinSlot, id: string, betaMode = false): HalieusSkinPreferences {
  const current = readEffectiveSkinPreferences(betaMode);
  const next = { ...current, [slot]: id };
  if (betaMode) sessionStorage.setItem(BETA_SKIN_PREVIEW_KEY, JSON.stringify(next));
  else localStorage.setItem(SKIN_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent<HalieusSkinPreferences>("halieus-skins-change", { detail: next }));
  return next;
}

export function clearBetaSkinPreview(): void {
  sessionStorage.removeItem(BETA_SKIN_PREVIEW_KEY);
}
