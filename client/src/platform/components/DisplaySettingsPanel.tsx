import { ModalPortal } from "./ModalPortal";
import { SkinLibraryButton } from "./SkinLibraryButton";
import type { HalieusSkinSlot } from "../skins";
import { ThemeButton } from "./ThemeButton";
import { useEffect, useState } from "react";
import { APP_RELEASE_LABEL, RELEASE_FINGERPRINT } from "../../version";
import {
  readDensity,
  readTextScale,
  saveDensity,
  saveTextScale,
  type HalieusDensity,
  type HalieusTextScale,
} from "../theme";

interface DisplaySettingsPanelProps {
  darkMode: boolean;
  soundEnabled?: boolean;
  onToggleDarkMode: () => void;
  onToggleSound?: () => void;
  onToggleFullscreen: () => void;
}

export function DisplaySettingsPanel({
  soundEnabled,
  onToggleSound,
  onToggleFullscreen,
}: DisplaySettingsPanelProps) {
  const [textScale, setTextScale] = useState<HalieusTextScale>(() => readTextScale());
  const [density, setDensity] = useState<HalieusDensity>(() => readDensity());
  const [buildInfoOpen, setBuildInfoOpen] = useState(false);

  useEffect(() => {
    const handleText = (event: Event) => setTextScale((event as CustomEvent<HalieusTextScale>).detail);
    const handleDensity = (event: Event) => setDensity((event as CustomEvent<HalieusDensity>).detail);
    window.addEventListener("halieus-text-scale", handleText);
    window.addEventListener("halieus-density", handleDensity);
    return () => {
      window.removeEventListener("halieus-text-scale", handleText);
      window.removeEventListener("halieus-density", handleDensity);
    };
  }, []);

  const changeTextScale = (value: HalieusTextScale) => {
    setTextScale(value);
    saveTextScale(value);
    window.dispatchEvent(new CustomEvent<HalieusTextScale>("halieus-text-scale", { detail: value }));
  };

  const changeDensity = (value: HalieusDensity) => {
    setDensity(value);
    saveDensity(value);
    window.dispatchEvent(new CustomEvent<HalieusDensity>("halieus-density", { detail: value }));
  };

  const path = window.location.pathname;
  const cosmeticSlots: HalieusSkinSlot[] = /^\/(game|join|spectate\/mega)\//.test(path) ? ["mega-board"] : /^\/poker\//.test(path) ? ["poker-table", "cards"] : /^\/(blackjack|whot|cheat)\//.test(path) ? ["cards"] : ["interface"];
  return (
    <section className="halieus-display-settings" aria-label="Display and sound settings">
      <SkinLibraryButton slots={cosmeticSlots} betaMode={sessionStorage.getItem("halieus-beta-test-mode") === "1"} stats={{ played: 0, wins: 0, winRate: 0, byGame: [], recent: [] }} />
      <p className="halieus-settings-eyebrow">Display & sound</p>

      <div className="halieus-display-group">
        <header><strong>Theme</strong><small>Preview any palette, then Apply to save it.</small></header>
        <ThemeButton darkMode={false} background="var(--hgr-surface)" colour="var(--hgr-text)" borderColour="var(--hgr-border)" onToggle={() => {}} />
      </div>

      <div className="halieus-display-group">
        <header><strong>Text & density</strong><small>Adjust readability without changing HGR’s typeface or visual identity.</small></header>
        <div className="halieus-preference-row">
          <span><strong>Text size</strong><small>Shared interface text</small></span>
          <div role="group" aria-label="Text size">
            {(["small", "standard", "large"] as HalieusTextScale[]).map((value) => <button type="button" key={value} className={textScale === value ? "is-active" : ""} aria-pressed={textScale === value} onClick={() => changeTextScale(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
        </div>
        <div className="halieus-preference-row">
          <span><strong>Interface density</strong><small>Spacing around shared controls</small></span>
          <div role="group" aria-label="Interface density">
            {(["compact", "standard", "comfortable"] as HalieusDensity[]).map((value) => <button type="button" key={value} className={density === value ? "is-active" : ""} aria-pressed={density === value} onClick={() => changeDensity(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
        </div>
      </div>

      <div className="halieus-settings-grid halieus-settings-grid-secondary">
        {onToggleSound && typeof soundEnabled === "boolean" && (
          <button type="button" onClick={onToggleSound} aria-pressed={soundEnabled}>
            <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
            <span><strong>{soundEnabled ? "Sound on" : "Sound muted"}</strong><small>Toggle game sounds</small></span>
          </button>
        )}
        <button type="button" onClick={onToggleFullscreen}>
          <span aria-hidden="true">⛶</span>
          <span><strong>Full screen</strong><small>Toggle browser full screen</small></span>
        </button>
        <button type="button" onClick={() => setBuildInfoOpen(true)}>
          <span aria-hidden="true">ⓘ</span>
          <span><strong>Build info</strong><small>Version and release fingerprint</small></span>
        </button>
      </div>
      {buildInfoOpen && <ModalPortal onClose={() => setBuildInfoOpen(false)}><div className="modal-backdrop halieus-confirm-backdrop"><div className="halieus-build-info-popover" role="dialog" aria-modal="true" aria-label="Build information"><button type="button" aria-label="Close build information" onClick={() => setBuildInfoOpen(false)}>×</button><p>HALIEUS GAME ROOM</p><h3>Build {APP_RELEASE_LABEL}</h3><span>Exact release</span><code>{RELEASE_FINGERPRINT}</code></div></div></ModalPortal>}
    </section>
  );
}
