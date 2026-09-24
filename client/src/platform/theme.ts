export type HalieusThemeMode = "system" | "dark" | "light" | "blue" | "red" | "green" | "profile" | "custom";
export type HalieusTextScale = "small" | "standard" | "large";
export type HalieusDensity = "compact" | "standard" | "comfortable";
export type HalieusThemeProfileId =
  | "blue-circuit"
  | "redline"
  | "emerald-arcade"
  | "ultraviolet"
  | "neon-grid"
  | "brass-coal"
  | "terminal"
  | "solar-dusk"
  | "icebox"
  | "cream-soda"
  | "midnight-rose"
  | "deep-ocean"
  | "ivory-8bit"
  | "lavender-16bit"
  | "black-drive"
  | "grey-disc";

export interface HalieusCustomTheme {
  page: string;
  surface: string;
  accent: string;
  secondary: string;
}

export interface HalieusThemeProfile {
  id: HalieusThemeProfileId;
  label: string;
  description: string;
  mood: string;
  theme: HalieusCustomTheme;
}

export const THEME_KEY = "halieus-game-room-theme";
export const THEME_PROFILE_KEY = "halieus-game-room-theme-profile";
export const CUSTOM_THEME_KEY = "halieus-game-room-custom-theme";
export const TEXT_SCALE_KEY = "halieus-game-room-text-scale";
export const DENSITY_KEY = "halieus-game-room-density";

export const DEFAULT_CUSTOM_THEME: HalieusCustomTheme = {
  page: "#111315",
  surface: "#1b1e22",
  accent: "#f0b83f",
  secondary: "#58a6ff",
};

export const THEME_PROFILES: readonly HalieusThemeProfile[] = [
  { id: "blue-circuit", label: "Blue Circuit", description: "Electric cobalt controls over an ink-black room.", mood: "Electric", theme: { page: "#050b14", surface: "#0c1726", accent: "#258dff", secondary: "#62d7ff" } },
  { id: "redline", label: "Redline", description: "Deep carbon surfaces with racing-red actions.", mood: "Aggressive", theme: { page: "#12080b", surface: "#241014", accent: "#e03b46", secondary: "#ff8a72" } },
  { id: "emerald-arcade", label: "Emerald Arcade", description: "Dark arcade cabinet greens with luminous mint.", mood: "Arcade", theme: { page: "#07110c", surface: "#102219", accent: "#3ccf78", secondary: "#93f5bd" } },
  { id: "ultraviolet", label: "Ultraviolet", description: "Near-black violet with bright spectral highlights.", mood: "Nightlife", theme: { page: "#0c0814", surface: "#1a1028", accent: "#9558ff", secondary: "#ef7cff" } },
  { id: "neon-grid", label: "Neon Grid", description: "Cyber cyan and magenta over a black glass shell.", mood: "Cyber", theme: { page: "#05090b", surface: "#0c171b", accent: "#00c9d8", secondary: "#ff45c8" } },
  { id: "brass-coal", label: "Brass & Coal", description: "Industrial charcoal with warm brass instrumentation.", mood: "Industrial", theme: { page: "#11100e", surface: "#211e19", accent: "#c98a2f", secondary: "#e5c07a" } },
  { id: "terminal", label: "Terminal", description: "Command-line black with phosphor green controls.", mood: "Retro", theme: { page: "#050705", surface: "#0d130e", accent: "#4de06f", secondary: "#b0ff8f" } },
  { id: "solar-dusk", label: "Solar Dusk", description: "Burnt-orange light cutting through aubergine shadows.", mood: "Cinematic", theme: { page: "#140b12", surface: "#261322", accent: "#f07b32", secondary: "#ffbf69" } },
  { id: "icebox", label: "Icebox", description: "Cold graphite, glacier blue and crisp white light.", mood: "Technical", theme: { page: "#0a1117", surface: "#14212c", accent: "#74bfff", secondary: "#d1efff" } },
  { id: "cream-soda", label: "Cream Soda", description: "Warm ivory surfaces with cola-brown and citrus accents.", mood: "Soft", theme: { page: "#eee7d8", surface: "#fffaf0", accent: "#a75d28", secondary: "#d69c32" } },
  { id: "midnight-rose", label: "Midnight Rose", description: "Black cherry panels with rose-metal highlights.", mood: "Luxe", theme: { page: "#10090d", surface: "#21131a", accent: "#c84d78", secondary: "#efa0bd" } },
  { id: "deep-ocean", label: "Deep Ocean", description: "Abyssal navy with teal-biological glow.", mood: "Atmospheric", theme: { page: "#041013", surface: "#0a2024", accent: "#159f9d", secondary: "#62e4d5" } },
  { id: "ivory-8bit", label: "8-bit Ivory", description: "Warm ivory, restrained red and charcoal inspired by early home-console hardware.", mood: "Retro 8-bit", theme: { page: "#d8d2c3", surface: "#f0ece2", accent: "#a72e35", secondary: "#c59a45" } },
  { id: "lavender-16bit", label: "16-bit Lavender", description: "Soft hardware grey with lavender and violet accents.", mood: "Retro 16-bit", theme: { page: "#c7c6c9", surface: "#e2e1e3", accent: "#7566a8", secondary: "#9f87c3" } },
  { id: "black-drive", label: "Black Drive", description: "Graphite black, metallic grey and restrained red for a sharper console-era room.", mood: "Retro Drive", theme: { page: "#08090b", surface: "#17191d", accent: "#c43138", secondary: "#8e99a5" } },
  { id: "grey-disc", label: "Grey Disc", description: "Cool hardware grey with muted blue and small primary-colour accents.", mood: "Retro Disc", theme: { page: "#bfc1c3", surface: "#dedfe0", accent: "#3f6597", secondary: "#b04d52" } },
] as const;

const HEX = /^#[0-9a-f]{6}$/i;
const PROFILE_IDS = new Set<HalieusThemeProfileId>(THEME_PROFILES.map((profile) => profile.id));

export function normaliseThemeColour(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim().toLowerCase() : fallback;
}

export function readThemeMode(): HalieusThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  if (value === "system" || value === "dark" || value === "light" || value === "blue" || value === "red" || value === "green" || value === "profile" || value === "custom") return value;
  return "system";
}

export function resolveThemeMode(mode: HalieusThemeMode, systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches): Exclude<HalieusThemeMode, "system"> {
  if (mode === "system") return systemPrefersDark ? "dark" : "light";
  return mode;
}

export function readThemeProfileId(): HalieusThemeProfileId {
  const value = localStorage.getItem(THEME_PROFILE_KEY) as HalieusThemeProfileId | null;
  return value && PROFILE_IDS.has(value) ? value : "blue-circuit";
}

export function readThemeProfile(): HalieusThemeProfile {
  const id = readThemeProfileId();
  return THEME_PROFILES.find((profile) => profile.id === id) ?? THEME_PROFILES[0];
}

export function saveThemeProfile(id: HalieusThemeProfileId): void {
  localStorage.setItem(THEME_PROFILE_KEY, id);
}

export function readTextScale(): HalieusTextScale {
  const value = localStorage.getItem(TEXT_SCALE_KEY);
  return value === "small" || value === "large" ? value : "standard";
}

export function saveTextScale(value: HalieusTextScale): void {
  localStorage.setItem(TEXT_SCALE_KEY, value);
}

export function readDensity(): HalieusDensity {
  const value = localStorage.getItem(DENSITY_KEY);
  return value === "compact" || value === "comfortable" ? value : "standard";
}

export function saveDensity(value: HalieusDensity): void {
  localStorage.setItem(DENSITY_KEY, value);
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
  const action = accentNeedsDepth ? mix(theme.accent, "#000000", 0.24) : theme.accent;
  const brandInk = isDarkColour(action) ? "#ffffff" : "#111318";
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
    "--hgr-brand-ink": brandInk,
    "--hgr-action-bg": action,
    "--hgr-action-ink": brandInk,
    "--hgr-logo-bg": action,
    "--hgr-logo-ink": brandInk,
    "--hgr-info": theme.secondary,
    "--hgr-update": theme.secondary,
    "--hgr-focus": `0 0 0 3px ${mix(theme.accent, theme.page, 0.55)}`,
    "--mm-page": theme.page,
    "--mm-surface": theme.surface,
    "--mm-surface-1": theme.surface,
    "--mm-surface-2": soft,
    "--mm-input": raised,
    "--mm-text": text,
    "--mm-muted": muted,
    "--mm-border": dark ? "#38404a" : "#ccd2d8",
  };
}

export function themeProfileVariables(profile: HalieusThemeProfile): Record<string, string> {
  return customThemeVariables(profile.theme);
}

export function clearCustomThemeVariables(root: HTMLElement): void {
  for (const key of Object.keys(customThemeVariables(DEFAULT_CUSTOM_THEME))) root.style.removeProperty(key);
}
