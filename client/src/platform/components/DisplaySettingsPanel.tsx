import { useEffect, useState } from "react";
import { APP_RELEASE_LABEL, RELEASE_FINGERPRINT } from "../../version";
import {
  readDensity,
  readTextScale,
  readThemeMode,
  readThemeProfileId,
  saveDensity,
  saveTextScale,
  saveThemeProfile,
  THEME_KEY,
  THEME_PROFILES,
  type HalieusDensity,
  type HalieusTextScale,
  type HalieusThemeMode,
  type HalieusThemeProfileId,
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
  const [themeMode, setThemeMode] = useState<HalieusThemeMode>(() => readThemeMode());
  const [themeProfileId, setThemeProfileId] = useState<HalieusThemeProfileId>(() => readThemeProfileId());
  const [textScale, setTextScale] = useState<HalieusTextScale>(() => readTextScale());
  const [density, setDensity] = useState<HalieusDensity>(() => readDensity());
  const [buildInfoOpen, setBuildInfoOpen] = useState(false);

  useEffect(() => {
    const handleTheme = (event: Event) => setThemeMode((event as CustomEvent<HalieusThemeMode>).detail);
    const handleProfile = (event: Event) => setThemeProfileId((event as CustomEvent<HalieusThemeProfileId>).detail);
    const handleText = (event: Event) => setTextScale((event as CustomEvent<HalieusTextScale>).detail);
    const handleDensity = (event: Event) => setDensity((event as CustomEvent<HalieusDensity>).detail);
    window.addEventListener("halieus-theme-mode", handleTheme);
    window.addEventListener("halieus-theme-profile", handleProfile);
    window.addEventListener("halieus-text-scale", handleText);
    window.addEventListener("halieus-density", handleDensity);
    return () => {
      window.removeEventListener("halieus-theme-mode", handleTheme);
      window.removeEventListener("halieus-theme-profile", handleProfile);
      window.removeEventListener("halieus-text-scale", handleText);
      window.removeEventListener("halieus-density", handleDensity);
    };
  }, []);

  const changeTheme = (mode: HalieusThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(THEME_KEY, mode);
    window.dispatchEvent(new CustomEvent<HalieusThemeMode>("halieus-theme-mode", { detail: mode }));
  };

  const changeProfile = (id: HalieusThemeProfileId) => {
    setThemeProfileId(id);
    saveThemeProfile(id);
    window.dispatchEvent(new CustomEvent<HalieusThemeProfileId>("halieus-theme-profile", { detail: id }));
    changeTheme("profile");
  };

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
    <section className="halieus-display-settings" aria-label="Display and sound settings">
      <p className="halieus-settings-eyebrow">Display & sound</p>

      <div className="halieus-display-group">
        <header><strong>Theme</strong><small>Standard modes stay immediate. More expressive profiles live in the library.</small></header>
        <div className="halieus-theme-mode-grid is-quick" role="group" aria-label="Quick theme mode">
          {(["system", "light", "dark"] as HalieusThemeMode[]).map((mode) => (
            <button
              type="button"
              key={mode}
              className={themeMode === mode ? "is-active" : ""}
              aria-pressed={themeMode === mode}
              onClick={() => changeTheme(mode)}
            >
              <span aria-hidden="true">{mode === "system" ? "◐" : mode === "dark" ? "●" : "○"}</span>
              <span><strong>{mode[0].toUpperCase() + mode.slice(1)}</strong><small>{mode === "system" ? "Follow this device" : "Standard " + mode}</small></span>
            </button>
          ))}
        </div>
        <div className="halieus-theme-library-select">
          <label>
            <span><strong>Theme Library</strong><small>{THEME_PROFILES.length} coordinated HGR profiles</small></span>
            <select value={themeMode === "profile" ? themeProfileId : ""} onChange={(event) => event.target.value && changeProfile(event.target.value as HalieusThemeProfileId)}>
              <option value="">Choose a profile…</option>
              {THEME_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label} — {profile.mood}</option>)}
            </select>
          </label>
          <button type="button" className={themeMode === "custom" ? "is-active" : ""} onClick={() => changeTheme("custom")}><span aria-hidden="true">✦</span><span><strong>Custom</strong><small>Your saved RGB / HEX palette</small></span></button>
        </div>
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
      {buildInfoOpen && <div className="halieus-build-info-popover" role="dialog" aria-modal="true" aria-label="Build information"><button type="button" aria-label="Close build information" onClick={() => setBuildInfoOpen(false)}>×</button><p>HALIEUS GAME ROOM</p><h3>Build {APP_RELEASE_LABEL}</h3><span>Exact release</span><code>{RELEASE_FINGERPRINT}</code></div>}
    </section>
  );
}
