import { useEffect, useState } from "react";
import { APP_VERSION, RELEASE_FINGERPRINT } from "../../version";

type ThemeMode = "system" | "light" | "dark";

interface DisplaySettingsPanelProps {
  darkMode: boolean;
  soundEnabled?: boolean;
  onToggleDarkMode: () => void;
  onToggleSound?: () => void;
  onToggleFullscreen: () => void;
}

const THEME_KEY = "halieus-game-room-theme";

function readThemeMode(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function DisplaySettingsPanel({
  soundEnabled,
  onToggleSound,
  onToggleFullscreen,
}: DisplaySettingsPanelProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode());
  const [buildInfoOpen, setBuildInfoOpen] = useState(false);

  useEffect(() => {
    const handle = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (next === "system" || next === "light" || next === "dark") setThemeMode(next);
    };
    window.addEventListener("halieus-theme-mode", handle);
    return () => window.removeEventListener("halieus-theme-mode", handle);
  }, []);

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(THEME_KEY, mode);
    window.dispatchEvent(new CustomEvent<ThemeMode>("halieus-theme-mode", { detail: mode }));
  };

  return (
    <section className="halieus-display-settings" aria-label="Display and sound settings">
      <p className="halieus-settings-eyebrow">Display & sound</p>
      <div className="halieus-theme-mode-grid" role="group" aria-label="Theme mode">
        {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
          <button
            type="button"
            key={mode}
            className={themeMode === mode ? "is-active" : ""}
            aria-pressed={themeMode === mode}
            onClick={() => changeTheme(mode)}
          >
            <span aria-hidden="true">{mode === "system" ? "◐" : mode === "light" ? "☀" : "☾"}</span>
            <span><strong>{mode[0].toUpperCase() + mode.slice(1)}</strong><small>{mode === "system" ? "Follow device" : `${mode} theme`}</small></span>
          </button>
        ))}
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
      {buildInfoOpen && <div className="halieus-build-info-popover" role="dialog" aria-modal="true" aria-label="Build information"><button type="button" aria-label="Close build information" onClick={() => setBuildInfoOpen(false)}>×</button><p>HALIEUS GAME ROOM</p><h3>Build {APP_VERSION}</h3><span>Exact release</span><code>{RELEASE_FINGERPRINT}</code></div>}
    </section>
  );
}
