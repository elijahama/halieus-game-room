import { useEffect, useState } from "react";

import {
  DEFAULT_CUSTOM_THEME,
  type HalieusCustomTheme,
  type HalieusThemeMode,
  readCustomTheme,
  readThemeMode,
  saveCustomTheme,
  THEME_KEY,
} from "../theme";

interface ThemeButtonProps {
  darkMode: boolean;
  background: string;
  colour: string;
  borderColour: string;
  onToggle: () => void;
}

function applyThemeMode(mode: HalieusThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
  window.dispatchEvent(new CustomEvent<HalieusThemeMode>("halieus-theme-mode", { detail: mode }));
}

function publishCustomTheme(theme: HalieusCustomTheme): void {
  saveCustomTheme(theme);
  window.dispatchEvent(new CustomEvent<HalieusCustomTheme>("halieus-custom-theme", { detail: theme }));
}

const THEME_OPTIONS: Array<{ mode: HalieusThemeMode; icon: string; label: string }> = [
  { mode: "dark", icon: "●", label: "Dark" },
  { mode: "light", icon: "○", label: "Light" },
  { mode: "blue", icon: "◆", label: "Blue" },
  { mode: "custom", icon: "✦", label: "Custom" },
];

export function ThemeButton({ background, colour, borderColour }: ThemeButtonProps) {
  const [mode, setMode] = useState<HalieusThemeMode>(() => readThemeMode());
  const [custom, setCustom] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const handleMode = (event: Event) => {
      const next = (event as CustomEvent<HalieusThemeMode>).detail;
      if (next === "dark" || next === "light" || next === "blue" || next === "custom") setMode(next);
    };
    const handleCustom = (event: Event) => setCustom((event as CustomEvent<HalieusCustomTheme>).detail);
    window.addEventListener("halieus-theme-mode", handleMode);
    window.addEventListener("halieus-custom-theme", handleCustom);
    return () => {
      window.removeEventListener("halieus-theme-mode", handleMode);
      window.removeEventListener("halieus-custom-theme", handleCustom);
    };
  }, []);

  function selectMode(next: HalieusThemeMode) {
    setMode(next);
    applyThemeMode(next);
    setEditorOpen(next === "custom");
  }

  function updateColour(key: keyof HalieusCustomTheme, value: string) {
    const next = { ...custom, [key]: value };
    setCustom(next);
    publishCustomTheme(next);
    if (mode !== "custom") {
      setMode("custom");
      applyThemeMode("custom");
    }
  }

  function resetCustom() {
    const next = { ...DEFAULT_CUSTOM_THEME };
    setCustom(next);
    publishCustomTheme(next);
    setMode("custom");
    applyThemeMode("custom");
  }

  return (
    <div className="theme-button halieus-theme-button halieus-theme-selector" style={{ background, color: colour, borderColor: borderColour }} aria-label="Theme">
      <span className="halieus-theme-compact-title">Theme</span>
      <div className="halieus-theme-segments is-four-mode" role="group" aria-label="Theme mode">
        {THEME_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.mode}
            className={mode === option.mode ? "is-active" : ""}
            aria-pressed={mode === option.mode}
            onClick={() => selectMode(option.mode)}
            title={`${option.label} theme`}
          >
            <span aria-hidden="true">{option.icon}</span><b>{option.label}</b>
          </button>
        ))}
      </div>
      {mode === "custom" && (
        <div className="halieus-custom-theme">
          <button type="button" className="halieus-custom-theme-toggle" onClick={() => setEditorOpen((open) => !open)} aria-expanded={editorOpen}>
            RGB / HEX {editorOpen ? "▲" : "▼"}
          </button>
          {editorOpen && (
            <div className="halieus-custom-theme-editor">
              <p><strong>Design your HGR colours</strong><small>Game identities keep their own colours.</small></p>
              {([
                ["page", "Background"],
                ["surface", "Panels"],
                ["accent", "Primary"],
                ["secondary", "Secondary"],
              ] as Array<[keyof HalieusCustomTheme, string]>).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input type="color" value={custom[key]} onChange={(event) => updateColour(key, event.target.value)} />
                  <input type="text" value={custom[key]} maxLength={7} onChange={(event) => /^#[0-9a-f]{6}$/i.test(event.target.value) && updateColour(key, event.target.value)} aria-label={`${label} HEX colour`} />
                </label>
              ))}
              <div className="halieus-custom-theme-preview" style={{ background: custom.page }}>
                <span style={{ background: custom.surface }}><i style={{ background: custom.accent }} /><b style={{ background: custom.secondary }} /></span>
              </div>
              <button type="button" className="button-muted" onClick={resetCustom}>Reset custom theme</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
