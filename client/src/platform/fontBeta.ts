/** Session-only, admin Test Lab typography previews. Never changes account cosmetics. */
export const BETA_FONT_KEY = "halieus-beta-font-preview";
export const BETA_FONT_OPTIONS = [
  { id: "balanced", label: "Balanced HGR", note: "Unbounded headings · Righteous emphasis · Varela text · Alata small" },
  { id: "unbounded", label: "Unbounded", note: "Bold geometric · compacted 1px" },
  { id: "righteous", label: "Righteous", note: "Expressive, rounded display" },
  { id: "alata", label: "Alata", note: "Clear, compact editorial" },
  { id: "fredoka", label: "Fredoka", note: "Friendly rounded" },
  { id: "varela-round", label: "Varela Round", note: "Soft, highly readable" },
] as const;

export type BetaFontId = (typeof BETA_FONT_OPTIONS)[number]["id"];

function isBetaFont(value: string | null): value is BetaFontId {
  return BETA_FONT_OPTIONS.some((item) => item.id === value);
}
export function readBetaFont(): BetaFontId {
  try {
    const saved = sessionStorage.getItem(BETA_FONT_KEY);
    return isBetaFont(saved) ? saved : "balanced";
  } catch {
    return "balanced";
  }
}
export function setBetaFont(font: BetaFontId): void {
  if (!isBetaFont(font)) return;
  if (sessionStorage.getItem("halieus-beta-test-mode") !== "1") return;
  sessionStorage.setItem(BETA_FONT_KEY, font);
  document.documentElement.dataset.betaFont = font;
  window.dispatchEvent(new CustomEvent<BetaFontId>("halieus-beta-font-change", { detail: font }));
}
export function syncBetaFont(isBetaOwner: boolean): void {
  if (isBetaOwner) {
    document.documentElement.dataset.betaFont = readBetaFont();
  } else {
    document.documentElement.removeAttribute("data-beta-font");
  }
}
export function clearBetaFontPreview(): void {
  sessionStorage.removeItem(BETA_FONT_KEY);
  document.documentElement.removeAttribute("data-beta-font");
}
