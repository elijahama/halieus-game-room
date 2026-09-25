import { SKIN_CATALOG, DEFAULT_SKIN_PREFERENCES, isSkinUnlocked, type HalieusSkinPreferences, type HalieusSkinSlot, type HalieusSkinDefinition, type HalieusSkinUnlockContext } from "../../../shared/platform/skins";
export * from "../../../shared/platform/skins";
export const SKIN_PREFERENCES_KEY = "halieus-game-room-skins";
export const BETA_SKIN_PREVIEW_KEY = "halieus-beta-skin-preview";

function validFor(slot: HalieusSkinSlot, id: unknown): id is string { return typeof id === "string" && SKIN_CATALOG.some(skin => skin.slot === slot && skin.id === id); }
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
