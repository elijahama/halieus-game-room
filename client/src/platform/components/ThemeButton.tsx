import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

interface ThemeButtonProps {
  darkMode: boolean;
  background: string;
  colour: string;
  borderColour: string;
  onToggle: () => void;
}

const THEME_KEY = "halieus-game-room-theme";

function readThemeMode(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function applyThemeMode(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
  window.dispatchEvent(new CustomEvent<ThemeMode>("halieus-theme-mode", { detail: mode }));
}

export function ThemeButton({ background, colour, borderColour }: ThemeButtonProps) {
  const [mode, setMode] = useState<ThemeMode>(() => readThemeMode());

  useEffect(() => {
    const handle = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (next === "system" || next === "light" || next === "dark") setMode(next);
    };
    window.addEventListener("halieus-theme-mode", handle);
    return () => window.removeEventListener("halieus-theme-mode", handle);
  }, []);

  function selectMode(next: ThemeMode) {
    if (next === mode) return;
    setMode(next);
    applyThemeMode(next);
  }

  return (
    <div
      className="theme-button halieus-theme-button halieus-theme-selector halieus-theme-segmented"
      style={{ background, color: colour, borderColor: borderColour }}
      aria-label="Theme"
    >
      <span className="halieus-theme-compact-title">Theme</span>
      <div className="halieus-theme-segments" role="group" aria-label="Theme mode">
        <button type="button" className={mode === "system" ? "is-active" : ""} aria-pressed={mode === "system"} onClick={() => selectMode("system")} title="Follow system theme">
          <span aria-hidden="true">◐</span><b>System</b>
        </button>
        <button type="button" className={mode === "light" ? "is-active" : ""} aria-pressed={mode === "light"} onClick={() => selectMode("light")} title="Light theme">
          <span aria-hidden="true">☀</span><b>Light</b>
        </button>
        <button type="button" className={mode === "dark" ? "is-active" : ""} aria-pressed={mode === "dark"} onClick={() => selectMode("dark")} title="Dark theme">
          <span aria-hidden="true">☾</span><b>Dark</b>
        </button>
      </div>
    </div>
  );
}
