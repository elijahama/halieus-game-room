import type { PlayerProgression } from "./progression.js";
export type ThemeRequirement = { kind: "core" } | { kind: "score"; count: number } | { kind: "played"; count: number } | { kind: "achievement"; id: string; label: string };
/** Stable IDs; theme rewards never use Elo, account role or client-supplied totals. */
export const THEME_REQUIREMENTS: Record<string, ThemeRequirement> = {
  "minimal-mono": {kind:"core"},
  "blue-circuit": {kind:"core"}, "redline": {kind:"core"}, "emerald-arcade": {kind:"core"},
  "ultraviolet": {kind:"core"}, "neon-grid": {kind:"core"}, "brass-coal": {kind:"core"},
  "terminal": {kind:"core"}, "solar-dusk": {kind:"core"}, "icebox": {kind:"core"},
  "cream-soda": {kind:"core"}, "midnight-rose": {kind:"core"}, "deep-ocean": {kind:"core"},
  "ivory-8bit": {kind:"achievement",id:"first-match",label:"Complete your first verified match"},
  "lavender-16bit": {kind:"score",count:40}, "black-drive": {kind:"score",count:50},
  "grey-disc": {kind:"played",count:5}, "xbox-core": {kind:"score",count:75},
  "ps2-midnight": {kind:"score",count:100}, "ps3-xmb": {kind:"score",count:150},
  "psp-silver": {kind:"played",count:10}, "psp-go-pearl": {kind:"score",count:200},
  "vita-graphite": {kind:"achievement",id:"active-hour",label:"Earn One hour of active play"},
  "ps4-wave": {kind:"score",count:250}, "dreamcast-white": {kind:"score",count:300},
  "cube-indigo": {kind:"achievement",id:"five-games",label:"Complete matches in five different games"},
  "n64-fog": {kind:"played",count:25}, "snes-colour": {kind:"score",count:350},
  "atari-woodgrain": {kind:"played",count:50}, "c64-breadbox": {kind:"score",count:400},
  "arcade-cabinet": {kind:"score",count:450}, "neo-arcade": {kind:"score",count:500},
};
export const ALL_THEME_IDS = Object.keys(THEME_REQUIREMENTS);
export const CORE_THEME_IDS = ALL_THEME_IDS.filter(id => THEME_REQUIREMENTS[id].kind === "core");
/** Beta is a testing override only: it never mutates or deletes the real entitlement metadata. */
export function themeIsAvailable(id: string, entitlements: readonly string[], betaMode = false): boolean {
  return ALL_THEME_IDS.includes(id) && (betaMode || entitlements.includes(id));
}
export function themeEntitlements(progression?: PlayerProgression): string[] {
 return Object.entries(THEME_REQUIREMENTS).filter(([,r]) => r.kind === "core" || !!progression && (
  r.kind === "score" ? progression.gamerScore >= r.count : r.kind === "played" ? progression.played >= r.count : progression.awards.some(a=>a.id===r.id)
 )).map(([id])=>id);
}
export function themeUnlockLabel(id: string): string {
 const rule = THEME_REQUIREMENTS[id];
 if (!rule) return "Unavailable";
 return rule.kind === "core" ? "Core · always available" : rule.kind === "score" ? `Earn ${rule.count} Gamer Score` : rule.kind === "played" ? `Complete ${rule.count} verified matches` : rule.label;
}
