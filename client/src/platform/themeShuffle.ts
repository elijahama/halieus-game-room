import { themeIsAvailable } from "../../../shared/platform/themeProgression";

/** Choose another visible, actually available theme. No entitlement mutations. */
export function nextShuffledThemeId(
  visibleProfiles: ReadonlyArray<{ id: string }>,
  verifiedEntitlements: readonly string[],
  betaMode: boolean,
  currentPreviewId: string | null,
  roll: number,
): string | null {
  const available = visibleProfiles.map(profile => profile.id)
    .filter(id => id !== currentPreviewId && themeIsAvailable(id, verifiedEntitlements, betaMode));
  if (!available.length) return null;
  const fraction = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0;
  return available[Math.floor(fraction * available.length)] ?? null;
}
