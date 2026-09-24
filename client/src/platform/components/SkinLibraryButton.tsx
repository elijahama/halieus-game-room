import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { HalieusPersonalStats } from "../../../../shared/platform/accounts";
import {
  isSkinUnlocked,
  readEffectiveSkinPreferences,
  saveSkinPreference,
  skinsForSlot,
  type HalieusSkinPreferences,
  type HalieusSkinSlot,
} from "../skins";

interface SkinLibraryButtonProps {
  stats: HalieusPersonalStats;
  betaMode: boolean;
}

const SLOT_COPY: Record<HalieusSkinSlot, { label: string; description: string }> = {
  interface: { label: "Interface", description: "Shared HGR shell and control treatment" },
  cards: { label: "Cards", description: "Poker and Blackjack card backs/table accents" },
  "mega-board": { label: "Mega Board", description: "Board field and framing treatment" },
};

export function SkinLibraryButton({ stats, betaMode }: SkinLibraryButtonProps) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HalieusSkinSlot>("interface");
  const [preferences, setPreferences] = useState<HalieusSkinPreferences>(() => readEffectiveSkinPreferences(betaMode));

  useEffect(() => {
    setPreferences(readEffectiveSkinPreferences(betaMode));
  }, [betaMode]);

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
        <span><strong>Skins</strong><small>{betaMode ? "Beta preview access" : "Cosmetics & unlocks"}</small></span>
      </button>

      {open && createPortal(
        <div className="halieus-skins-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="halieus-skins-dialog" role="dialog" aria-modal="true" aria-label="HGR skins">
            <header>
              <div><p>COSMETICS</p><h2>HGR Skin Library</h2><span>{betaMode ? "Test Lab preview: every skin is available for this beta session only. Your normal player unlocks stay untouched." : "Cosmetics unlock through normal play. Account role does not bypass player progression."}</span></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close skin library">×</button>
            </header>

            <nav aria-label="Skin category">
              {(["interface", "cards", "mega-board"] as HalieusSkinSlot[]).map((item) => (
                <button type="button" key={item} className={slot === item ? "is-active" : ""} onClick={() => setSlot(item)}>
                  <strong>{SLOT_COPY[item].label}</strong>
                  <small>{SLOT_COPY[item].description}</small>
                </button>
              ))}
            </nav>

            <div className="halieus-skins-grid">
              {skins.map((skin) => {
                const unlocked = isSkinUnlocked(skin, stats, betaMode);
                const active = preferences[slot] === skin.id;
                return <button type="button" key={skin.id} className={(active ? "is-active " : "") + (unlocked ? "is-unlocked" : "is-locked")} disabled={!unlocked} onClick={() => choose(skin.id, unlocked)}>
                  <span className={"halieus-skin-preview skin-" + skin.id} aria-hidden="true"><i /><i /><b>H</b></span>
                  <span><em>{skin.mood}</em><strong>{skin.label}</strong><small>{skin.description}</small></span>
                  <span className="halieus-skin-state">{active ? "Equipped" : betaMode ? "Beta preview" : unlocked ? "Unlocked" : "🔒 " + skin.unlock.label}</span>
                </button>;
              })}
            </div>

            <footer><span>{betaMode ? "Leaving Test Lab automatically restores your normal equipped skins." : "Skins are visual only and never change game rules, odds, ranks or rewards."}</span></footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
