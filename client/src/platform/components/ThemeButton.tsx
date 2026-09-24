import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

interface PopoverPosition {
  left: number;
  top: number;
  width: number;
}

function applyThemeMode(mode: HalieusThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
  window.dispatchEvent(new CustomEvent<HalieusThemeMode>("halieus-theme-mode", { detail: mode }));
}

function publishCustomTheme(theme: HalieusCustomTheme): void {
  saveCustomTheme(theme);
  window.dispatchEvent(new CustomEvent<HalieusCustomTheme>("halieus-custom-theme", { detail: theme }));
}

function rgbChannels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
}

function rgbHex(channels: [number, number, number]): string {
  return `#${channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
}

const CUSTOM_PRESETS: Array<{ id: string; label: string; description: string; theme: HalieusCustomTheme }> = [
  { id: "graphite", label: "Graphite", description: "Neutral dark studio", theme: { page: "#111315", surface: "#1b1e22", accent: "#f0b83f", secondary: "#58a6ff" } },
  { id: "slate", label: "Slate", description: "Cool grey workspace", theme: { page: "#171a1f", surface: "#252a31", accent: "#d9a441", secondary: "#76a7d7" } },
  { id: "deep-blue", label: "Deep Blue", description: "Blue-black control room", theme: { page: "#09131d", surface: "#122334", accent: "#4cc2ff", secondary: "#8c9bff" } },
  { id: "warm", label: "Warm Studio", description: "Soft charcoal + amber", theme: { page: "#171411", surface: "#26211c", accent: "#f3a847", secondary: "#d8846f" } },
];

const THEME_OPTIONS: Array<{ mode: HalieusThemeMode; icon: string; label: string; description: string }> = [
  { mode: "system", icon: "◐", label: "System", description: "Follow this device" },
  { mode: "dark", icon: "●", label: "Dark", description: "Low-light HGR" },
  { mode: "light", icon: "○", label: "Light", description: "Bright HGR" },
  { mode: "blue", icon: "◆", label: "Blue", description: "Deep blue HGR" },
  { mode: "custom", icon: "✦", label: "Custom", description: "Your RGB / HEX palette" },
];

export function ThemeButton({ background, colour, borderColour }: ThemeButtonProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [mode, setMode] = useState<HalieusThemeMode>(() => readThemeMode());
  const [custom, setCustom] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [draft, setDraft] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({ left: 12, top: 12, width: 268 });

  const activeOption = THEME_OPTIONS.find((option) => option.mode === mode) ?? THEME_OPTIONS[0];

  useEffect(() => {
    const handleMode = (event: Event) => {
      const next = (event as CustomEvent<HalieusThemeMode>).detail;
      if (next === "system" || next === "dark" || next === "light" || next === "blue" || next === "custom") setMode(next);
    };
    const handleCustom = (event: Event) => {
      const next = (event as CustomEvent<HalieusCustomTheme>).detail;
      setCustom(next);
      setDraft(next);
    };
    window.addEventListener("halieus-theme-mode", handleMode);
    window.addEventListener("halieus-custom-theme", handleCustom);
    return () => {
      window.removeEventListener("halieus-theme-mode", handleMode);
      window.removeEventListener("halieus-custom-theme", handleCustom);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const positionMenu = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(280, Math.max(220, window.innerWidth - 24));
      const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
      const menuHeight = 300;
      const above = rect.top - menuHeight - 8;
      const top = above >= 12 ? above : Math.min(window.innerHeight - menuHeight - 12, rect.bottom + 8);
      setPopoverPosition({ left, top: Math.max(12, top), width });
    };
    positionMenu();
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen && !editorOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      setEditorOpen(false);
      setDraft(custom);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [custom, editorOpen, menuOpen]);

  function selectMode(next: HalieusThemeMode) {
    if (next === "custom") {
      setDraft(custom);
      setMenuOpen(false);
      setEditorOpen(true);
      return;
    }
    setMode(next);
    applyThemeMode(next);
    setMenuOpen(false);
  }

  function updateDraftColour(key: keyof HalieusCustomTheme, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateRgbChannel(key: keyof HalieusCustomTheme, channelIndex: number, value: number) {
    const channels = rgbChannels(draft[key]);
    channels[channelIndex] = Number.isFinite(value) ? value : channels[channelIndex];
    updateDraftColour(key, rgbHex(channels));
  }

  function applyCustom() {
    const next = { ...draft };
    setCustom(next);
    publishCustomTheme(next);
    setMode("custom");
    applyThemeMode("custom");
    setEditorOpen(false);
  }

  function cancelCustom() {
    setDraft(custom);
    setEditorOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="theme-button halieus-theme-button halieus-theme-trigger"
        style={{ background, color: colour, borderColor: borderColour }}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="halieus-theme-trigger-label">Theme</span>
        <span className="halieus-theme-trigger-value"><i aria-hidden="true">{activeOption.icon}</i><b>{activeOption.label}</b></span>
        <span className="halieus-theme-trigger-chevron" aria-hidden="true">{menuOpen ? "▴" : "▾"}</span>
      </button>

      {menuOpen && createPortal(
        <>
          <button type="button" className="halieus-theme-popover-scrim" onClick={() => setMenuOpen(false)} aria-label="Close theme menu" />
          <div
            className="halieus-theme-popover"
            style={{ left: popoverPosition.left, top: popoverPosition.top, width: popoverPosition.width }}
            role="listbox"
            aria-label="Theme"
          >
            <header><span>Appearance</span><small>Choose a room theme</small></header>
            {THEME_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.mode}
                className={mode === option.mode ? "is-active" : ""}
                role="option"
                aria-selected={mode === option.mode}
                onClick={() => selectMode(option.mode)}
              >
                <i aria-hidden="true">{option.icon}</i>
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
                <b aria-hidden="true">{mode === option.mode ? "✓" : ""}</b>
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}

      {editorOpen && createPortal(
        <div className="halieus-custom-theme-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && cancelCustom()}>
          <section className="halieus-custom-theme-dialog" role="dialog" aria-modal="true" aria-label="Custom HGR theme">
            <header>
              <div><p>CUSTOM THEME</p><h2>Tune the interface palette</h2><span>Treat HGR like a creative app: set the workspace, panels and UI accents while each game keeps its own identity.</span></div>
              <button type="button" onClick={cancelCustom} aria-label="Close custom theme editor">×</button>
            </header>
            <section className="halieus-custom-presets" aria-label="Custom theme presets">
              <header><strong>Interface presets</strong><span>Start with a coordinated workspace, then fine-tune it.</span></header>
              <div>{CUSTOM_PRESETS.map((preset) => (
                <button type="button" key={preset.id} onClick={() => setDraft({ ...preset.theme })}>
                  <span className="halieus-custom-preset-swatch" aria-hidden="true">
                    <i style={{ background: preset.theme.page }} />
                    <i style={{ background: preset.theme.surface }} />
                    <i style={{ background: preset.theme.accent }} />
                    <i style={{ background: preset.theme.secondary }} />
                  </span>
                  <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
                </button>
              ))}</div>
            </section>
            <div className="halieus-custom-theme-grid">
              {([
                ["page", "Workspace"],
                ["surface", "Panels"],
                ["accent", "Primary UI"],
                ["secondary", "Secondary UI"],
              ] as Array<[keyof HalieusCustomTheme, string]>).map(([key, label]) => (
                <article key={key} className="halieus-custom-colour-card">
                  <header><strong>{label}</strong><code>{draft[key].toUpperCase()}</code></header>
                  <div className="halieus-custom-colour-main">
                    <input type="color" value={draft[key]} onChange={(event) => updateDraftColour(key, event.target.value)} aria-label={`${label} colour picker`} />
                    <input
                      key={draft[key]}
                      type="text"
                      defaultValue={draft[key]}
                      maxLength={7}
                      onBlur={(event) => {
                        if (/^#[0-9a-f]{6}$/i.test(event.target.value)) updateDraftColour(key, event.target.value.toLowerCase());
                        else event.currentTarget.value = draft[key];
                      }}
                      aria-label={`${label} HEX colour`}
                    />
                  </div>
                  <div className="halieus-rgb-fields" aria-label={`${label} RGB channels`}>
                    {rgbChannels(draft[key]).map((channel, channelIndex) => (
                      <label key={channelIndex}>
                        <b>{["R", "G", "B"][channelIndex]}</b>
                        <input type="number" min={0} max={255} value={channel} onChange={(event) => updateRgbChannel(key, channelIndex, Number(event.target.value))} />
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="halieus-custom-theme-preview" style={{ background: draft.page }}>
              <section className="halieus-custom-preview-window" style={{ background: draft.surface }}>
                <header><i style={{ background: draft.accent }} /><b>HALIEUS GAME ROOM</b><em style={{ background: draft.secondary }} /></header>
                <div><strong>Game night</strong><span style={{ borderColor: draft.accent }}>Primary action</span><small style={{ color: draft.secondary }}>Secondary accent</small></div>
              </section>
              <div className="halieus-custom-preview-palette" aria-label="Selected palette">
                {(["page", "surface", "accent", "secondary"] as Array<keyof HalieusCustomTheme>).map((key) => <span key={key}><i style={{ background: draft[key] }} /><code>{draft[key].toUpperCase()}</code></span>)}
              </div>
              <small>Live palette preview</small>
            </div>
            <footer>
              <button type="button" className="button-muted" onClick={() => setDraft({ ...DEFAULT_CUSTOM_THEME })}>Reset</button>
              <span />
              <button type="button" className="button-outline" onClick={cancelCustom}>Cancel</button>
              <button type="button" className="button-primary" onClick={applyCustom}>Apply custom theme</button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
