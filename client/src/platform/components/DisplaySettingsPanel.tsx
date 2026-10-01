import { ThemeButton } from "./ThemeButton";
import { HalieusBrandMark } from "./HalieusBrandMark";
import type { HgrLogoPreset } from "../../../../shared/platform/brand";
import { useEffect, useState } from "react";
import {
  readDensity,
  readLogoPreset,
  readTextScale,
  saveDensity,
  saveLogoPreset,
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
  const [logoPreset, setLogoPreset] = useState<HgrLogoPreset>(() => readLogoPreset());

  useEffect(() => {
    const handleText = (event: Event) => setTextScale((event as CustomEvent<HalieusTextScale>).detail);
    const handleDensity = (event: Event) => setDensity((event as CustomEvent<HalieusDensity>).detail);
    const handleLogo = (event: Event) => setLogoPreset((event as CustomEvent<HgrLogoPreset>).detail);
    window.addEventListener("halieus-text-scale", handleText);
    window.addEventListener("halieus-density", handleDensity);
    window.addEventListener("halieus-logo-preset", handleLogo);
    return () => {
      window.removeEventListener("halieus-text-scale", handleText);
      window.removeEventListener("halieus-density", handleDensity);
      window.removeEventListener("halieus-logo-preset", handleLogo);
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

  const changeLogoPreset = (value: HgrLogoPreset) => {
    setLogoPreset(value);
    saveLogoPreset(value);
    window.dispatchEvent(new CustomEvent<HgrLogoPreset>("halieus-logo-preset", { detail: value }));
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

      <div className="halieus-display-group halieus-display-group-logo">
        <header>
          <div><strong>Halieus logo</strong><small>Choose the H treatment independently from your colour theme.</small></div>
          <span>Personal</span>
        </header>
        {([
          {
            id: "core",
            label: "Core styles",
            options: [
              ["brand", "Theme", "Theme-aware tile"],
              ["mono-light", "Mono light", "Dark H on a light tile"],
              ["mono-dark", "Mono dark", "Light H on a dark tile"],
              ["white-glyph", "White glyph", "White H with no tile"],
            ],
          },
          {
            id: "launcher",
            label: "Launcher styles",
            options: [
              ["black-glyph", "Black glyph", "Black H with no tile"],
              ["light", "Light tile", "Theme-safe light mark"],
              ["blue", "Blue tile", "Royal-blue launcher treatment"],
              ["gold", "Gold launcher", "Signature gold launcher mark"],
            ],
          },
          {
            id: "additional",
            label: "Additional options",
            options: [
              ["adaptive", "Adaptive", "Follows this device light/dark state"],
              ["launcher-default", "Launcher default", "Use the standard HGR launcher treatment"],
            ],
          },
        ] as Array<{ id: string; label: string; options: Array<[HgrLogoPreset,string,string]> }>).map((group) => (
          <section className={`halieus-logo-preset-section is-${group.id}`} key={group.id} aria-labelledby={`halieus-logo-${group.id}`}>
            <div className="halieus-logo-preset-section-heading">
              <span id={`halieus-logo-${group.id}`}>{group.label}</span>
              <i aria-hidden="true" />
            </div>
            <div className="halieus-logo-preset-grid" role="group" aria-label={group.label}>
              {group.options.map(([value,label,description]) => (
                <button type="button" key={value} className={logoPreset === value ? "is-active" : ""} aria-pressed={logoPreset === value} onClick={() => changeLogoPreset(value)}>
                  <HalieusBrandMark preset={value} className="halieus-logo-preset-preview" />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </button>
              ))}
            </div>
          </section>
        ))}
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
