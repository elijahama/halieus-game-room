import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { HalieusPersonalStats } from "../../../../shared/platform/accounts";
import {
  isSkinUnlocked,
  readEffectiveSkinPreferences,
  saveSkinPreference,
  skinsForSlot,
  type HalieusGameRatings,
  type HalieusSkinPreferences,
  type HalieusSkinSlot,
  type HalieusSkinUnlockContext,
} from "../skins";

type ContextualSlot = Extract<HalieusSkinSlot, "mega-board" | "poker-table" | "cards">;

interface ContextualCosmeticsButtonProps {
  slot: ContextualSlot;
  stats: HalieusPersonalStats;
  betaMode: boolean;
  ratings?: HalieusGameRatings;
  compact?: boolean;
}

const SLOT_COPY: Record<ContextualSlot, { label: string; noun: string; description: string }> = {
  "mega-board": { label: "Board style", noun: "Mega Board style", description: "Preview board materials without changing layout or rules." },
  "poker-table": { label: "Table style", noun: "Poker table style", description: "Preview felt, rail and table-room materials." },
  cards: { label: "Card style", noun: "Card style", description: "Preview the shared card-back and deck treatment." },
};

function publishPreview(preferences: HalieusSkinPreferences): void {
  window.dispatchEvent(new CustomEvent<HalieusSkinPreferences>("halieus-skins-change", { detail: preferences }));
}

function CosmeticPreview({ slot, skinId }: { slot: ContextualSlot; skinId: string }) {
  if (slot === "mega-board") {
    return <span className={`hgr-contextual-cosmetic-preview is-board skin-${skinId}`} aria-hidden="true">
      <i className="preview-board-frame"><b /><b /><b /><b /><em /></i>
    </span>;
  }
  if (slot === "poker-table") {
    return <span className={`hgr-contextual-cosmetic-preview is-poker skin-${skinId}`} aria-hidden="true">
      <i className="preview-poker-table"><b /><b /><b /><em /></i>
    </span>;
  }
  return <span className={`hgr-contextual-cosmetic-preview is-cards skin-${skinId}`} aria-hidden="true">
    <i className="preview-card-back" /><i className="preview-card-back is-front" />
  </span>;
}

export function ContextualCosmeticsButton({ slot, stats, betaMode, ratings = {}, compact = false }: ContextualCosmeticsButtonProps) {
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState(() => readEffectiveSkinPreferences(betaMode)[slot]);
  const committedRef = useRef(readEffectiveSkinPreferences(betaMode));
  const unlockContext = useMemo<HalieusSkinUnlockContext>(() => ({ stats, ratings }), [ratings, stats]);
  const skins = useMemo(() => skinsForSlot(slot), [slot]);

  function restoreCommitted() {
    publishPreview(committedRef.current);
    setPreviewId(committedRef.current[slot]);
  }

  function closeWithoutApply() {
    restoreCommitted();
    setOpen(false);
  }

  function openPicker() {
    const committed = readEffectiveSkinPreferences(betaMode);
    committedRef.current = committed;
    setPreviewId(committed[slot]);
    setOpen(true);
  }

  function preview(skinId: string, unlocked: boolean) {
    if (!unlocked) return;
    const next = { ...committedRef.current, [slot]: skinId };
    setPreviewId(skinId);
    publishPreview(next);
  }

  function apply() {
    const next = saveSkinPreference(slot, previewId, betaMode);
    committedRef.current = next;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithoutApply();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, previewId]);

  useEffect(() => () => {
    if (open) publishPreview(committedRef.current);
  }, [open]);

  const selected = skins.find((skin) => skin.id === previewId) ?? skins[0];

  return <>
    <button type="button" className={`hgr-contextual-cosmetics-trigger${compact ? " is-compact" : ""}`} onClick={openPicker}>
      <CosmeticPreview slot={slot} skinId={selected?.id ?? previewId} />
      <span><strong>{SLOT_COPY[slot].label}</strong><small>{selected?.label ?? "Choose cosmetic"}</small></span>
      <b aria-hidden="true">Customize →</b>
    </button>
    {open && createPortal(
      <div className="hgr-contextual-cosmetics-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeWithoutApply()}>
        <section className="hgr-contextual-cosmetics-dialog" role="dialog" aria-modal="true" aria-label={SLOT_COPY[slot].noun}>
          <header>
            <div><p>COSMETICS</p><h2>{SLOT_COPY[slot].noun}</h2><span>{SLOT_COPY[slot].description}</span></div>
            <button type="button" onClick={closeWithoutApply} aria-label="Close cosmetics">×</button>
          </header>
          <div className="hgr-contextual-cosmetics-grid">
            {skins.map((skin) => {
              const unlocked = isSkinUnlocked(skin, unlockContext, betaMode);
              const active = previewId === skin.id;
              return <button type="button" key={skin.id} disabled={!unlocked} className={`${active ? "is-active " : ""}${unlocked ? "is-unlocked" : "is-locked"}`} onClick={() => preview(skin.id, unlocked)}>
                <CosmeticPreview slot={slot} skinId={skin.id} />
                <span><em>{skin.mood}</em><strong>{skin.label}</strong><small>{skin.description}</small></span>
                <b>{active ? "Previewing" : betaMode ? "Beta preview" : unlocked ? "Preview" : `🔒 ${skin.unlock.label}`}</b>
              </button>;
            })}
          </div>
          <footer>
            <span>Preview changes the live surface temporarily. Apply saves it; Cancel restores your previous cosmetic.</span>
            <div><button type="button" className="button-outline" onClick={closeWithoutApply}>Cancel</button><button type="button" className="button-primary" onClick={apply}>Apply</button></div>
          </footer>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
