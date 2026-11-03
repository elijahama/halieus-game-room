/** Owner-approved HGR public site; no secondary play.halieus.net domain exists. */
export const HGR_CANONICAL_PUBLIC_ORIGIN = "https://halieus.remotewire.net";

const RETIRED_ORIGINS = new Set([
  "http://play.halieus.net",
  "https://play.halieus.net",
]);

/** Preserve valid custom/local origins, but never advertise the retired host. */
export function normaliseHgrPublicOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return RETIRED_ORIGINS.has(parsed.origin)
      ? HGR_CANONICAL_PUBLIC_ORIGIN
      : parsed.origin;
  } catch {
    return null;
  }
}
