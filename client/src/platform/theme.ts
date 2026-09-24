export type HalieusThemeMode = "system" | "dark" | "light" | "blue" | "custom";

export interface HalieusCustomTheme {
  page: string;
  surface: string;
  accent: string;
  secondary: string;
}

export const THEME_KEY = "halieus-game-room-theme";
export const CUSTOM_THEME_KEY = "halieus-game-room-custom-theme";

export const DEFAULT_CUSTOM_THEME: HalieusCustomTheme = {
  page: "#111315",
  surface: "#1b1e22",
  accent: "#f0b83f",
  secondary: "#58a6ff",
};

const HEX = /^#[0-9a-f]{6}$/i;

export function normaliseThemeColour(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}

export function readThemeMode(): HalieusThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "system" || value === "dark" || value === "light" || value === "blue" || value === "custom") return value;
  return "system";
}

export function resolveThemeMode(mode: HalieusThemeMode, systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches): Exclude<HalieusThemeMode, "system" | "custom"> | "custom" {
  if (mode === "system") return systemPrefersDark ? "dark" : "light";
  return mode;
}

export function readCustomTheme(): HalieusCustomTheme {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_THEME_KEY) ?? "{}") as Partial<HalieusCustomTheme>;
    return {
      page: normaliseThemeColour(parsed.page, DEFAULT_CUSTOM_THEME.page),
      surface: normaliseThemeColour(parsed.surface, DEFAULT_CUSTOM_THEME.surface),
      accent: normaliseThemeColour(parsed.accent, DEFAULT_CUSTOM_THEME.accent),
      secondary: normaliseThemeColour(parsed.secondary, DEFAULT_CUSTOM_THEME.secondary),
    };
  } catch {
    return { ...DEFAULT_CUSTOM_THEME };
  }
}

export function saveCustomTheme(theme: HalieusCustomTheme): void {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(theme));
}

function rgb(hex: string): [number, number, number] {
  const value = normaliseThemeColour(hex, "#000000").slice(1);
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)];
}

export function isDarkColour(hex: string): boolean {
  const [r, g, b] = rgb(hex).map((channel) => channel / 255) as [number, number, number];
  const linear = [r, g, b].map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] < 0.36;
}

function mix(a: string, b: string, weight: number): string {
  const first = rgb(a);
  const second = rgb(b);
  const mixed = first.map((channel, index) => Math.round(channel * (1 - weight) + second[index] * weight));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function customThemeVariables(theme: HalieusCustomTheme): Record<string, string> {
  const dark = isDarkColour(theme.page);
  const text = dark ? "#f8fafc" : "#101318";
  const textSoft = dark ? "#d7dbe2" : "#343a44";
  const muted = dark ? "#a6adb8" : "#68707c";
  const raised = mix(theme.surface, dark ? "#ffffff" : "#000000", dark ? 0.05 : 0.025);
  const soft = mix(theme.surface, dark ? "#ffffff" : "#000000", dark ? 0.09 : 0.06);
  const strong = mix(theme.surface, dark ? "#ffffff" : "#000000", dark ? 0.15 : 0.11);
  const accentNeedsDepth = !isDarkColour(theme.accent);
  const action = accentNeedsDepth ? mix(theme.accent, "#000000", 0.28) : theme.accent;
  return {
    "--hgr-page": theme.page,
    "--hgr-surface": theme.surface,
    "--hgr-surface-raised": raised,
    "--hgr-surface-soft": soft,
    "--hgr-surface-strong": strong,
    "--hgr-text": text,
    "--hgr-text-soft": textSoft,
    "--hgr-muted": muted,
    "--hgr-border": dark ? "rgba(255,255,255,.11)" : "rgba(10,14,20,.12)",
    "--hgr-border-strong": dark ? "rgba(255,255,255,.19)" : "rgba(10,14,20,.21)",
    "--hgr-yellow": theme.accent,
    "--hgr-yellow-strong": theme.accent,
    "--hgr-brand": theme.accent,
    "--hgr-brand-soft": mix(theme.accent, dark ? "#ffffff" : "#000000", dark ? 0.28 : 0.16),
    "--hgr-brand-ink": "#ffffff",
    "--hgr-action-bg": action,
    "--hgr-action-ink": "#ffffff",
    "--hgr-logo-bg": action,
    "--hgr-logo-ink": "#ffffff",
    "--hgr-info": theme.secondary,
    "--hgr-update": theme.secondary,
    "--hgr-focus": `0 0 0 3px ${mix(theme.accent, theme.page, 0.55)}`,
  };
}

export function clearCustomThemeVariables(root: HTMLElement): void {
  for (const key of Object.keys(customThemeVariables(DEFAULT_CUSTOM_THEME))) root.style.removeProperty(key);
}
