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
  | "grey-disc"
  | "xbox-core"
  | "ps2-midnight"
  | "ps3-xmb"
  | "psp-silver"
  | "psp-go-pearl"
  | "vita-graphite"
  | "ps4-wave"
  | "dreamcast-white"
  | "cube-indigo"
  | "n64-fog"
  | "snes-colour"
  | "atari-woodgrain"
  | "c64-breadbox"
  | "arcade-cabinet"
  | "neo-arcade";

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
  /** Small hardware/controller colour flecks used only as decorative theme identity. */
  motif?: readonly string[];
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
  { id: "xbox-core", label: "Green Core", description: "Black hardware, acid green and restrained silver with restrained silver controls.", mood: "Console Green", motif: ["#62b52f","#d6e84a","#4f7aa5","#cfd3d5"], theme: { page: "#080b08", surface: "#141a14", accent: "#62b52f", secondary: "#a7b0a6" } },
  { id: "ps2-midnight", label: "Emotion Midnight", description: "Deep midnight navy with electric blue and cool hardware grey.", mood: "Console Midnight", motif: ["#315bd8","#d85a73","#6bbf84","#9b79ce"], theme: { page: "#050814", surface: "#0d1324", accent: "#315bd8", secondary: "#7989a8" } },
  { id: "ps3-xmb", label: "Cell Glass", description: "Gloss-black surfaces, graphite chrome and cool blue highlights.", mood: "Console Gloss", motif: ["#536f98","#aeb8c5","#71a8d9","#76818f"], theme: { page: "#090a0d", surface: "#17191f", accent: "#536f98", secondary: "#b4bcc8" } },
  { id: "psp-silver", label: "Pocket Silver", description: "Portable graphite and brushed silver with cool blue controls.", mood: "Portable", motif: ["#d4d8de","#7ea0c8","#555d68","#98a2ad"], theme: { page: "#202329", surface: "#343840", accent: "#7ea0c8", secondary: "#d4d8de" } },
  { id: "psp-go-pearl", label: "Slide Pearl", description: "Pearl-white portable hardware with charcoal controls and soft blue details.", mood: "Portable Light", motif: ["#f7f8f8","#5e7797","#31343a","#aeb9c4"], theme: { page: "#e6e7e8", surface: "#f7f8f8", accent: "#5e7797", secondary: "#31343a" } },
  { id: "vita-graphite", label: "OLED Graphite", description: "OLED-black graphite with cobalt-blue portable-console accents.", mood: "Portable Graphite", motif: ["#2871d8","#6fa5ef","#111722","#aebed1"], theme: { page: "#070a10", surface: "#111722", accent: "#2871d8", secondary: "#7e9bc2" } },
  { id: "ps4-wave", label: "Orbis Blue", description: "Dark navy shell with vivid system blue and cool-white highlights.", mood: "Console Wave", motif: ["#1677d2","#d8e6f5","#233c68","#6c90b9"], theme: { page: "#071020", surface: "#101d35", accent: "#1677d2", secondary: "#d8e6f5" } },
  { id: "dreamcast-white", label: "Katana Pearl", description: "Soft hardware white with charcoal type and a warm orange accent.", mood: "Disc White", motif: ["#de6b2c","#f5f5f2","#535b65","#8fa0af"], theme: { page: "#dedede", surface: "#f5f5f2", accent: "#de6b2c", secondary: "#535b65" } },
  { id: "cube-indigo", label: "Dolphin Indigo", description: "Indigo console plastic with graphite, silver and warm secondary accents.", mood: "Cube", motif: ["#786cc7","#4ba696","#d86c57","#d9c469"], theme: { page: "#292442", surface: "#403962", accent: "#786cc7", secondary: "#e0a35d" } },
  { id: "n64-fog", label: "Ultra Fog", description: "Warm console grey with blue-green-red-yellow controller-colour flecks.", mood: "64-bit", motif: ["#3769a8","#5a9a62","#b94f4f","#d8bd4f"], theme: { page: "#b8b6b0", surface: "#dedbd4", accent: "#3769a8", secondary: "#5a9a62" } },
  { id: "snes-colour", label: "Super Colour", description: "Soft shell grey with lavender hardware tones and the classic four-colour controller-button palette.", mood: "16-bit Colour", motif: ["#4f9d72","#d85858","#d3b63e","#5c76c9"], theme: { page: "#c9c7c5", surface: "#ebe9e5", accent: "#7a68a9", secondary: "#4f9d72" } },
  { id: "atari-woodgrain", label: "Woodgrain", description: "Warm woodgrain brown, charcoal plastic and restrained amber controls.", mood: "Woodgrain", theme: { page: "#211813", surface: "#38271d", accent: "#b47735", secondary: "#d7b27b" } },
  { id: "c64-breadbox", label: "Breadbox", description: "Breadbox beige with brown keycaps and muted blue-grey secondary controls.", mood: "Home Computer", theme: { page: "#6c5948", surface: "#9a806a", accent: "#d0b08d", secondary: "#596985" } },
  { id: "arcade-cabinet", label: "Coin-Op Neon", description: "Near-black cabinet surfaces with red, cyan and amber control-light accents.", mood: "Coin-op", motif: ["#d33b3b","#27a7b8","#d59d2d","#6e59c8"], theme: { page: "#060708", surface: "#111416", accent: "#d33b3b", secondary: "#27a7b8" } },
  { id: "neo-arcade", label: "Arcade Crimson", description: "Dark arcade hardware with vivid red, cool blue and crisp white instrumentation.", mood: "Arcade Hardware", motif: ["#d52e36","#4a87c4","#e7e9eb","#d1a63b"], theme: { page: "#090b0d", surface: "#171b20", accent: "#d52e36", secondary: "#4a87c4" } },
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

export function colourLuminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((channel) => channel / 255) as [number, number, number];
  const linear = [r, g, b].map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function isDarkColour(hex: string): boolean {
  return colourLuminance(hex) < 0.36;
}

export function readableInk(surfaces: string[], preferred?: string): string {
  const contrast = (ink: string) => Math.min(...surfaces.map(surface => {
    const a = colourLuminance(ink), b = colourLuminance(surface);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }));
  if (preferred && contrast(preferred) >= 4.5) return preferred;
  return contrast("#000000") >= contrast("#ffffff") ? "#000000" : "#ffffff";
}

function mix(a: string, b: string, weight: number): string {
  const first = rgb(a);
  const second = rgb(b);
  const mixed = first.map((channel, index) => Math.round(channel * (1 - weight) + second[index] * weight));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

export function customThemeVariables(theme: HalieusCustomTheme): Record<string, string> {
  const pageDark = isDarkColour(theme.page);
  const surfaceDark = isDarkColour(theme.surface);
  const text = readableInk([theme.surface], surfaceDark ? "#f8fafc" : "#101318");
  // Derived surfaces move away from the foreground, including middle-luminance
  // custom colours where neither a fixed dark nor a fixed light palette works.
  const surfaceTarget = colourLuminance(text) > 0.5 ? "#000000" : "#ffffff";
  const raised = mix(theme.surface, surfaceTarget, 0.05);
  const soft = mix(theme.surface, surfaceTarget, 0.09);
  const strong = mix(theme.surface, surfaceTarget, 0.15);
  const surfaces = [theme.surface, raised, soft, strong];
  const textSoft = readableInk(surfaces, surfaceDark ? "#d7dbe2" : "#343a44");
  const muted = readableInk(surfaces, surfaceDark ? "#a6adb8" : "#68707c");
  const pageText = readableInk([theme.page], pageDark ? "#f8fafc" : "#101318");
  const accentNeedsDepth = !isDarkColour(theme.accent);
  const action = accentNeedsDepth ? mix(theme.accent, "#000000", 0.24) : theme.accent;
  const brandInk = readableInk([action], "#ffffff");
  return {
    "--hgr-page": theme.page,
    "--hgr-surface": theme.surface,
    "--hgr-surface-raised": raised,
    "--hgr-surface-soft": soft,
    "--hgr-surface-strong": strong,
    "--hgr-page-text": pageText,
    "--hgr-surface-text": text,
    "--hgr-text": text,
    "--hgr-text-soft": textSoft,
    "--hgr-muted": muted,
    "--hgr-border": surfaceDark ? "rgba(255,255,255,.11)" : "rgba(10,14,20,.12)",
    "--hgr-border-strong": surfaceDark ? "rgba(255,255,255,.19)" : "rgba(10,14,20,.21)",
    "--hgr-yellow": theme.accent,
    "--hgr-yellow-strong": theme.accent,
    "--hgr-brand": theme.accent,
    "--hgr-brand-soft": mix(theme.accent, surfaceDark ? "#ffffff" : "#000000", surfaceDark ? 0.28 : 0.16),
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
    "--mm-border": surfaceDark ? "#38404a" : "#ccd2d8",
  };
}

export function themeProfileVariables(profile: HalieusThemeProfile): Record<string, string> {
  return customThemeVariables(profile.theme);
}

export function clearCustomThemeVariables(root: HTMLElement): void {
  for (const key of Object.keys(customThemeVariables(DEFAULT_CUSTOM_THEME))) root.style.removeProperty(key);
}
