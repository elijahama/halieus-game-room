import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { HalieusPersonalStats } from "../../../../shared/platform/accounts";
import {
  isSkinUnlocked,
  readEffectiveSkinPreferences,
  sanitiseSkinPreferences,
  saveSkinPreference,
  saveSkinPreferences,
  skinsForSlot,
  type HalieusGameRatings,
  type HalieusSkinPreferences,
  type HalieusSkinSlot,
  type HalieusSkinUnlockContext,
} from "../skins";

interface SkinLibraryButtonProps {
  stats: HalieusPersonalStats;
  betaMode: boolean;
  ratings?: HalieusGameRatings;
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

export function SkinLibraryButton({ stats, betaMode, ratings = {} }: SkinLibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HalieusSkinSlot>("interface");
  const [preferences, setPreferences] = useState<HalieusSkinPreferences>(() => readEffectiveSkinPreferences(betaMode));

  const unlockContext = useMemo<HalieusSkinUnlockContext>(() => ({
    stats,
    ratings,
  }), [ratings, stats]);

  useEffect(() => {
    const current = readEffectiveSkinPreferences(betaMode);
    const safe = sanitiseSkinPreferences(current, unlockContext, betaMode);
    const changed = (Object.keys(safe) as HalieusSkinSlot[]).some((key) => safe[key] !== current[key]);
    if (changed) saveSkinPreferences(safe, betaMode);
    setPreferences(safe);
  }, [betaMode, unlockContext]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const skins = useMemo(() => skinsForSlot(slot), [slot]);

  const choose = (skinId: string, unlocked: boolean) => {
    if (!unlocked) return;
    setPreferences(saveSkinPreference(slot, skinId, betaMode));
  };

  return (
    <>
      <button type="button" className="halieus-skins-trigger" onClick={() => setOpen(true)}>
        <span aria-hidden="true">◇</span>
        <span><strong>Skins</strong><small>{betaMode ? "Beta preview access" : "Boards, tables & cosmetics"}</small></span>
      </button>

      {open && createPortal(
        <div className="halieus-skins-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="halieus-skins-dialog" role="dialog" aria-modal="true" aria-label="HGR skins">
            <header>
              <div><p>COSMETICS</p><h2>HGR Theme & Skin Library</h2><span>{betaMode ? "Test Lab preview: every cosmetic is available for this beta session only. Your normal player unlocks stay untouched." : "Change how HGR boards, tables and shared surfaces look without changing game rules or layout."}</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close skin library">×</button>
            </header>

            <nav aria-label="Skin category">
              {(["interface", "mega-board", "poker-table", "cards"] as HalieusSkinSlot[]).map((item) => (
                <button type="button" key={item} className={slot === item ? "is-active" : ""} onClick={() => setSlot(item)}>
                  <strong>{SLOT_COPY[item].label}</strong>
                  <small>{SLOT_COPY[item].description}</small>
                </button>
              ))}
            </nav>

            <div className="halieus-skins-grid">
              {skins.map((skin) => {
                const unlocked = isSkinUnlocked(skin, unlockContext, betaMode);
                const active = preferences[slot] === skin.id;
                const state = active
                  ? "Equipped"
                  : betaMode
                    ? "Beta preview"
                    : unlocked
                      ? "Unlocked"
                      : "🔒 " + skin.unlock.label;
                return <button type="button" key={skin.id} className={(active ? "is-active " : "") + (unlocked ? "is-unlocked" : "is-locked")} disabled={!unlocked} onClick={() => choose(skin.id, unlocked)}>
                  <span className={"halieus-skin-preview skin-" + skin.id} aria-hidden="true"><i /><i /><b>H</b></span>
                  <span><em>{COLLECTION_LABELS[skin.collection]} · {skin.mood}</em><strong>{skin.label}</strong><small>{skin.description}</small></span>
                  <span className="halieus-skin-state">{state}</span>
                </button>;
              })}
            </div>

            <footer>
              <span>{betaMode ? "Leaving Test Lab automatically restores your normal equipped cosmetics." : "Cosmetics are visual only. Rating gates use a game’s real ranking data; games without a live rating model use play/win unlocks instead."}</span>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
