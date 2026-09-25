import { readThemeMode, readThemeProfileId, readCustomTheme, saveThemeProfile, saveCustomTheme, THEME_KEY, type HalieusThemeMode, type HalieusThemeProfileId, type HalieusCustomTheme } from "./theme";
export type ThemeSelection = { mode: HalieusThemeMode; profile: HalieusThemeProfileId; custom: HalieusCustomTheme };
export function committedTheme(): ThemeSelection { return { mode: readThemeMode(), profile: readThemeProfileId(), custom: readCustomTheme() }; }
export function previewTheme(value: ThemeSelection): void {
  window.dispatchEvent(new CustomEvent("halieus-theme-profile", { detail: value.profile }));
  window.dispatchEvent(new CustomEvent("halieus-custom-theme", { detail: value.custom }));
  window.dispatchEvent(new CustomEvent("halieus-theme-mode", { detail: value.mode }));
}
export function commitTheme(value: ThemeSelection): void {
  saveThemeProfile(value.profile); saveCustomTheme(value.custom); localStorage.setItem(THEME_KEY, value.mode); previewTheme(value);
}
