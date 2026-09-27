import { ModalPortal } from "./ModalPortal";
import { accountApi } from "../accounts/api";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import type { HalieusPersonalStats } from "../../../../shared/platform/accounts";
import {
  readEffectiveSkinPreferences,
  saveSkinPreference,
  saveSkinPreferences,
  skinsForSlot,
  type HalieusGameRatings,
  type HalieusSkinPreferences,
  type HalieusSkinSlot,
} from "../skins";

interface SkinLibraryButtonProps {
  roomStyle?: string;
  onRoomStyleChange?: (id: string) => Promise<void>;
  readOnly?: boolean;
  stats: HalieusPersonalStats;
  betaMode: boolean;
  ratings?: HalieusGameRatings;
  slots?: HalieusSkinSlot[];
}

const SLOT_COPY: Record<HalieusSkinSlot, { label: string; description: string }> = {
  interface: { label: "Interface", description: "Shared HGR shell and control treatment" },
  cards: { label: "Cards", description: "Card backs and deck treatment" },
  "mega-board": { label: "Mega Board", description: "Board surface, framing and atmosphere" },
  "poker-table": { label: "Poker Table", description: "Felt, rail and table-room treatment" },
};

const COLLECTION_LABELS = {
  core: "Core",
  retro: "Retro",
  competitive: "Competitive",
  prestige: "Prestige",
  event: "Event",
} as const;

export function SkinLibraryButton({ stats, betaMode, ratings = {}, slots = ["interface"], roomStyle, onRoomStyleChange, readOnly = false }: SkinLibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HalieusSkinSlot>(slots[0]);
  const [preferences, setPreferences] = useState<HalieusSkinPreferences>(() => readEffectiveSkinPreferences(betaMode));

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const contextualSlot = slots.length === 1 ? slots[0] : null;
  const triggerLabel = contextualSlot === "mega-board" ? "Board styles" : contextualSlot === "poker-table" ? "Table styles" : contextualSlot === "cards" ? "Card styles" : "Cosmetics";
  const triggerDescription = contextualSlot === "mega-board"
    ? (betaMode ? "Preview every Mega Board surface" : "Unlocked boards & requirements")
    : betaMode ? "Beta preview access" : "Visual rewards & unlocks";

  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { if (betaMode) return; let live = true; void accountApi<{ preferences: HalieusSkinPreferences; entitlements: string[] }>("/accounts/me/cosmetics").then(result => { if (live) { setEntitlements(result.entitlements); setPreferences(result.preferences); saveSkinPreferences(result.preferences); } }).catch(() => { if (live) setError("Sign in to save earned cosmetics."); }); return () => { live = false; }; }, [betaMode, open]);
  const skins = useMemo(() => skinsForSlot(slot), [slot]);

  const choose = async (skinId: string, unlocked: boolean) => {
    if (!unlocked || readOnly) return;
    if (roomStyle !== undefined) {
      try { await onRoomStyleChange?.(skinId); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to change Room Style."); }
      return;
    }
    if (betaMode) { setPreferences(saveSkinPreference(slot, skinId, true)); return; }
    try { const result = await accountApi<{ preferences: HalieusSkinPreferences }>("/accounts/me/cosmetics", { method: "POST", body: JSON.stringify({ slot, id: skinId }) }); setPreferences(result.preferences); saveSkinPreferences(result.preferences); setError(""); } catch { setError("Unable to equip this cosmetic. Your saved selection is unchanged."); }
  };

  return (
    <>
      <button type="button" className="halieus-skins-trigger" onClick={() => setOpen(true)}>
        <span aria-hidden="true">◇</span>
        <span><strong>{triggerLabel}</strong><small>{triggerDescription}</small></span>
      </button>

      {open && (<ModalPortal onClose={() => setOpen(false)}>
        <div className="halieus-skins-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="halieus-skins-dialog" role="dialog" aria-modal="true" aria-label="HGR skins">
            <header>
              <div><p>COSMETICS</p><h2>Game appearance</h2><span>{betaMode ? "Test Lab preview: every cosmetic is available for this beta session only. Your normal player unlocks stay untouched." : "Change how HGR boards, tables and shared surfaces look without changing game rules or layout."}</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close skin library">×</button>
            </header>

            <nav aria-label="Skin category">
              {slots.map((item) => (
                <button type="button" key={item} className={slot === item ? "is-active" : ""} onClick={() => setSlot(item)}>
                  <strong>{SLOT_COPY[item].label}</strong>
                  <small>{SLOT_COPY[item].description}</small>
                </button>
              ))}
            </nav>

            <div className="halieus-skins-grid">
              {skins.map((skin) => {
                const unlocked = betaMode || entitlements.includes(skin.id);
                const active = (roomStyle ?? preferences[slot]) === skin.id;
                const state = active
                  ? "Equipped"
                  : betaMode
                    ? "Beta preview"
                    : unlocked
                      ? "Unlocked"
                      : "🔒 " + skin.unlock.label;
                return <button type="button" key={skin.id} className={(active ? "is-active " : "") + (unlocked ? "is-unlocked" : "is-locked")} disabled={!unlocked || readOnly} onClick={() => void choose(skin.id, unlocked)}>
                  {skin.previewPalette ? (
                    <span className="halieus-skin-preview halieus-skin-palette" aria-hidden="true">
                      {skin.previewPalette.map((colour, index) => <i key={`${skin.id}-${index}`} style={{ "--skin-source-colour": colour } as CSSProperties} />)}
                    </span>
                  ) : (
                    <span className={"halieus-skin-preview skin-" + skin.id} aria-hidden="true"><i /><i /><b>{slot === "cards" ? "♠" : slot === "poker-table" ? "♠ ♥ ♣ ♦" : slot === "mega-board" ? "GO ▧ ▧ ▧" : "Aa"}</b></span>
                  )}
                  <span><em>{COLLECTION_LABELS[skin.collection]} · {skin.mood}</em><strong>{skin.label}</strong><small>{skin.description}</small></span>
                  <span className="halieus-skin-state">{state}</span>
                </button>;
              })}
            </div>

            {error && <p role="status">{error}</p>}
            <footer>
              <span>{betaMode ? "Leaving Test Lab automatically restores your normal equipped cosmetics." : "Cosmetics are visual only. Account role does not bypass player progression. Rating gates use a game’s real ranking data; games without a live rating model use play/win unlocks instead."}</span>
            </footer>
          </section>
        </div></ModalPortal>
      )}
    </>
  );
}
