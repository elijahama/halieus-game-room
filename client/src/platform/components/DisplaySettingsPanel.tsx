import { ThemeButton } from "./ThemeButton";
import { useEffect, useState } from "react";
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
  showFullscreen?: boolean;
}

export function DisplaySettingsPanel({
  soundEnabled,
  onToggleSound,
  onToggleFullscreen,
  showFullscreen = true,
}: DisplaySettingsPanelProps) {
  const [textScale, setTextScale] = useState<HalieusTextScale>(() => readTextScale());
  const [density, setDensity] = useState<HalieusDensity>(() => readDensity());

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

  return (
    <section className="halieus-display-settings" aria-label="Appearance settings">
      <div className="halieus-display-group halieus-display-group-theme">
        <header>
          <div><strong>Theme</strong><small>Platform chrome follows the selected HGR palette.</small></div>
          <span>Preview → Apply</span>
        </header>
        <ThemeButton darkMode={false} background="var(--hgr-surface)" colour="var(--hgr-text)" borderColour="var(--hgr-border)" onToggle={() => {}} />
      </div>

      <div className="halieus-display-group halieus-display-group-readability">
        <header><div><strong>Readability</strong><small>Shared player settings used across the Game Room and in-game menus.</small></div></header>
        <div className="halieus-preference-row">
          <span><strong>Text size</strong><small>Small, standard or large interface text</small></span>
          <div role="group" aria-label="Text size">
            {(["small", "standard", "large"] as HalieusTextScale[]).map((value) => (
              <button type="button" key={value} className={textScale === value ? "is-active" : ""} aria-pressed={textScale === value} onClick={() => changeTextScale(value)}>
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="halieus-preference-row">
          <span><strong>Interface density</strong><small>Compact, standard or comfortable spacing</small></span>
          <div role="group" aria-label="Interface density">
            {(["compact", "standard", "comfortable"] as HalieusDensity[]).map((value) => (
              <button type="button" key={value} className={density === value ? "is-active" : ""} aria-pressed={density === value} onClick={() => changeDensity(value)}>
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(onToggleSound || showFullscreen) && (
        <div className="halieus-settings-grid halieus-settings-grid-secondary">
          {onToggleSound && typeof soundEnabled === "boolean" && (
            <button type="button" onClick={onToggleSound} aria-pressed={soundEnabled}>
              <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
              <span><strong>{soundEnabled ? "Sound on" : "Sound muted"}</strong><small>Toggle game sounds</small></span>
            </button>
          )}
          {showFullscreen && (
            <button type="button" onClick={onToggleFullscreen}>
              <span aria-hidden="true">⛶</span>
              <span><strong>Full screen</strong><small>Toggle browser full screen</small></span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
