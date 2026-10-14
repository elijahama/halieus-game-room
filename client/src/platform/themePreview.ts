import { THEME_PROFILES, readThemeMode, readThemeProfileId, readCustomTheme, saveThemeProfile, saveCustomTheme, THEME_KEY, type HalieusThemeMode, type HalieusThemeProfileId, type HalieusCustomTheme } from "./theme";

export type ThemeSelection = { mode: HalieusThemeMode; profile: HalieusThemeProfileId; custom: HalieusCustomTheme };

const BETA_MODE_KEY = "halieus-beta-test-mode";
export const BETA_THEME_SELECTION_KEY = "halieus-beta-theme-selection";
const MODES: readonly HalieusThemeMode[] = ["system", "dark", "light", "blue", "red", "green", "profile", "custom"];

function normalTheme(): ThemeSelection {
  return { mode: readThemeMode(), profile: readThemeProfileId(), custom: readCustomTheme() };
}

function betaTheme(): ThemeSelection | null {
  try {
    if (sessionStorage.getItem(BETA_MODE_KEY) !== "1") return null;
    const encoded = sessionStorage.getItem(BETA_THEME_SELECTION_KEY);
    if (!encoded) return null;
    const value = JSON.parse(encoded) as Partial<ThemeSelection>;
    if (!value || !MODES.includes(value.mode as HalieusThemeMode) ||
      !THEME_PROFILES.some((profile) => profile.id === value.profile) ||
      !value.custom || typeof value.custom !== "object") return null;
    const colours = value.custom as unknown as Record<string, unknown>;
    if (!(["page", "surface", "accent", "secondary"] as const).every((key) =>
      typeof colours[key] === "string" && /^#[0-9a-f]{6}$/i.test(colours[key]))) return null;
    return value as ThemeSelection;
  } catch { return null; }
}

/** Beta appearance is isolated from permanent preferences and survives a
 * refresh within the same Test Lab session. */
export function committedTheme(): ThemeSelection {
  return betaTheme() ?? normalTheme();
}

export function previewTheme(value: ThemeSelection): void {
  window.dispatchEvent(new CustomEvent("halieus-theme-profile", { detail: value.profile }));
  window.dispatchEvent(new CustomEvent("halieus-custom-theme", { detail: value.custom }));
  window.dispatchEvent(new CustomEvent("halieus-theme-mode", { detail: value.mode }));
}

export function commitTheme(value: ThemeSelection): void {
  if (sessionStorage.getItem(BETA_MODE_KEY) === "1") {
    sessionStorage.setItem(BETA_THEME_SELECTION_KEY, JSON.stringify(value));
  } else {
    saveThemeProfile(value.profile);
    saveCustomTheme(value.custom);
    localStorage.setItem(THEME_KEY, value.mode);
  }
  previewTheme(value);
}

/** Called only when leaving Beta or signing out, after the Beta flag clears. */
export function clearBetaThemePreview(): void {
  sessionStorage.removeItem(BETA_THEME_SELECTION_KEY);
  previewTheme(normalTheme());
}
