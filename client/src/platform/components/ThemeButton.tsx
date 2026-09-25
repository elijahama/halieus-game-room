import { useModalLifecycle } from "./useModalLifecycle";
import { committedTheme, previewTheme, commitTheme, type ThemeSelection } from "../themePreview";
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  DEFAULT_CUSTOM_THEME,
  THEME_PROFILES,
  type HalieusCustomTheme,
  type HalieusThemeMode,
  type HalieusThemeProfileId,
  readCustomTheme,
  readThemeMode,
  readThemeProfileId,
  readableInk,
} from "../theme";

interface ThemeButtonProps {
  darkMode: boolean;
  background: string;
  colour: string;
  borderColour: string;
  onToggle: () => void;
}

function rgbChannels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
}

function rgbHex(channels: [number, number, number]): string {
  return `#${channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
}

const CUSTOM_PRESETS: Array<{ id: string; label: string; description: string; theme: HalieusCustomTheme }> = [
  { id: "studio-graphite", label: "Studio Graphite", description: "Neutral dark workspace", theme: { page: "#111315", surface: "#1b1e22", accent: "#e3ad35", secondary: "#6f9fd8" } },
  { id: "soft-light", label: "Soft Light", description: "Warm bright workspace", theme: { page: "#f3f0e8", surface: "#fffdf8", accent: "#d79a19", secondary: "#4c78a8" } },
  { id: "deep-blue", label: "Deep Blue", description: "Blue-black control room", theme: { page: "#07111c", surface: "#102033", accent: "#3a8fd8", secondary: "#78bdf2" } },
  { id: "forest", label: "Forest", description: "Deep green studio", theme: { page: "#0d1713", surface: "#16251e", accent: "#4ca86a", secondary: "#8ac6a1" } },
  { id: "crimson", label: "Crimson", description: "Charcoal with red focus", theme: { page: "#171012", surface: "#27191d", accent: "#cc4b52", secondary: "#e18a8f" } },
  { id: "aubergine", label: "Aubergine", description: "Purple creative suite", theme: { page: "#15101a", surface: "#241a2c", accent: "#9a68c7", secondary: "#d09be9" } },
  { id: "cyan", label: "Cyan Studio", description: "Cool dark production UI", theme: { page: "#0c1517", surface: "#162428", accent: "#38a9b8", secondary: "#78d4df" } },
  { id: "warm-amber", label: "Warm Amber", description: "Soft charcoal and amber", theme: { page: "#171411", surface: "#26211c", accent: "#e09a31", secondary: "#d37c65" } },
  { id: "slate-mint", label: "Slate Mint", description: "Cool grey with mint", theme: { page: "#15191d", surface: "#242a30", accent: "#63b79c", secondary: "#8da9c4" } },
  { id: "midnight-violet", label: "Midnight Violet", description: "Near-black violet studio", theme: { page: "#0f0d16", surface: "#1d1828", accent: "#7657c9", secondary: "#b08be4" } },
  { id: "sand", label: "Sand", description: "Muted light neutral", theme: { page: "#ece7dc", surface: "#f8f5ed", accent: "#b67a20", secondary: "#657c91" } },
  { id: "high-contrast", label: "High Contrast", description: "Maximum separation", theme: { page: "#070707", surface: "#171717", accent: "#f0c33c", secondary: "#58a8ff" } },
];

const QUICK_OPTIONS: Array<{ mode: "system" | "light" | "dark"; icon: string; label: string; description: string }> = [
  { mode: "system", icon: "◐", label: "System", description: "Follow this device" },
  { mode: "light", icon: "○", label: "Light", description: "Standard bright HGR" },
  { mode: "dark", icon: "●", label: "Dark", description: "Standard graphite HGR" },
];

const RETRO_PROFILE_IDS = new Set<HalieusThemeProfileId>([
  "ivory-8bit",
  "lavender-16bit",
  "black-drive",
  "grey-disc",
  "xbox-core",
  "ps2-midnight",
  "ps3-xmb",
  "psp-silver",
  "psp-go-pearl",
  "vita-graphite",
  "ps4-wave",
  "dreamcast-white",
  "cube-indigo",
  "n64-fog",
  "snes-colour",
  "atari-woodgrain",
  "c64-breadbox",
  "arcade-cabinet",
  "neo-arcade",
]);
const THEME_PROFILE_GROUPS = [
  { id: "hgr", label: "HGR Profiles", description: "Coordinated Halieus palettes", profiles: THEME_PROFILES.filter((profile) => !RETRO_PROFILE_IDS.has(profile.id)) },
  { id: "retro", label: "Retro Consoles", description: "Original console-era inspired palettes", profiles: THEME_PROFILES.filter((profile) => RETRO_PROFILE_IDS.has(profile.id)) },
] as const;


export function ThemeButton({ background, colour, borderColour }: ThemeButtonProps) {
  const pending = useRef<ThemeSelection | null>(null);
  const [mode, setMode] = useState<HalieusThemeMode>(() => readThemeMode());
  const [profileId, setProfileId] = useState<HalieusThemeProfileId>(() => readThemeProfileId());
  const [custom, setCustom] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [draft, setDraft] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null), editorRef = useRef<HTMLElement>(null);
  useModalLifecycle(menuOpen, menuRef, () => { setMenuOpen(false); setLibraryOpen(false); });
  useModalLifecycle(editorOpen, editorRef, () => setEditorOpen(false));
  const activeProfile = THEME_PROFILES.find((profile) => profile.id === profileId) ?? THEME_PROFILES[0];
  const activeLabel = mode === "profile"
    ? activeProfile.label
    : mode === "blue" ? "Blue"
    : mode === "red" ? "Red"
    : mode === "green" ? "Green"
    : mode === "custom" ? "Custom"
    : mode[0].toUpperCase() + mode.slice(1);
  const activeIcon = mode === "system" ? "◐" : mode === "light" ? "○" : mode === "dark" ? "●" : mode === "custom" ? "✦" : "◆";
  const previewSurfaceInk = readableInk([draft.surface], "#101318");
  const previewSurfaceMuted = readableInk([draft.surface], "#4b5563");
  const previewPageInk = readableInk([draft.page], "#101318");
  const previewPageMuted = readableInk([draft.page], "#4b5563");

  useEffect(() => {
    const handleMode = (event: Event) => setMode((event as CustomEvent<HalieusThemeMode>).detail);
    const handleProfile = (event: Event) => setProfileId((event as CustomEvent<HalieusThemeProfileId>).detail);
    const handleCustom = (event: Event) => {
      const next = (event as CustomEvent<HalieusCustomTheme>).detail;
      setCustom(next);
    };
    window.addEventListener("halieus-theme-mode", handleMode);
    window.addEventListener("halieus-theme-profile", handleProfile);
    window.addEventListener("halieus-custom-theme", handleCustom);
    return () => {
      window.removeEventListener("halieus-theme-mode", handleMode);
      window.removeEventListener("halieus-theme-profile", handleProfile);
      window.removeEventListener("halieus-custom-theme", handleCustom);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !editorOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLibraryOpen(false);
      setMenuOpen(false);
      setEditorOpen(false);
      setDraft(custom);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [custom, editorOpen, libraryOpen, menuOpen]);

  function preview(next: ThemeSelection) { pending.current = next; previewTheme(next); }
  function cancelPreview() { pending.current = null; previewTheme(committedTheme()); }
  function applyPreview() { if (pending.current) commitTheme(pending.current); pending.current = null; setMenuOpen(false); setEditorOpen(false); }
  useEffect(() => { if (!menuOpen && !editorOpen && pending.current) cancelPreview(); }, [menuOpen, editorOpen]);
  useEffect(() => () => { if (pending.current) previewTheme(committedTheme()); }, []);
  useEffect(() => { if (editorOpen) preview({ ...committedTheme(), mode: "custom", custom: draft }); }, [draft, editorOpen]);
  function selectMode(next: "system" | "light" | "dark") {
    preview({ ...committedTheme(), mode: next });
  }
  function selectProfile(id: HalieusThemeProfileId) {
    preview({ ...committedTheme(), mode: "profile", profile: id });
  }

  function openCustom() {
    setDraft(custom);
    setLibraryOpen(false);
    setMenuOpen(false);
    setEditorOpen(true);
  }

  function updateDraftColour(key: keyof HalieusCustomTheme, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateRgbChannel(key: keyof HalieusCustomTheme, channelIndex: number, value: number) {
    const channels = rgbChannels(draft[key]);
    channels[channelIndex] = Number.isFinite(value) ? value : channels[channelIndex];
    updateDraftColour(key, rgbHex(channels));
  }

  function applyCustom() { commitTheme({ ...committedTheme(), mode: "custom", custom: draft }); pending.current = null; setEditorOpen(false); }

  function cancelCustom() {
    setDraft(custom);
    setEditorOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="theme-button halieus-theme-button halieus-theme-trigger"
        style={{ background, color: colour, borderColor: borderColour }}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        onClick={() => { setLibraryOpen(false); setMenuOpen((open) => !open); }}
      >
        <span className="halieus-theme-trigger-label">Theme</span>
        <span className="halieus-theme-trigger-value"><i aria-hidden="true">{activeIcon}</i><b>{activeLabel}</b></span>
        <span className="halieus-theme-trigger-chevron" aria-hidden="true">{menuOpen ? "▴" : "▾"}</span>
      </button>

      {menuOpen && createPortal(
        <div className="halieus-theme-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget !== event.target) return;
          cancelPreview();
          setLibraryOpen(false);
          setMenuOpen(false);
        }}>
          <div
            ref={menuRef}
            className={`halieus-theme-popover ${libraryOpen ? "is-library-open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={libraryOpen ? "Theme Library" : "Appearance"}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header><span>{libraryOpen ? "Theme Library" : "Appearance"}</span><small>{libraryOpen ? "Go further than a colour swap" : "Fast defaults, library or your own palette"}</small></header>

            {!libraryOpen ? <>
              <div className="halieus-theme-quick-grid">
                {QUICK_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.mode}
                    className={mode === option.mode ? "is-active" : ""}
                    aria-pressed={mode === option.mode}
                    onClick={() => selectMode(option.mode)}
                  >
                    <i aria-hidden="true">{option.icon}</i>
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                    <b aria-hidden="true">{mode === option.mode ? "✓" : ""}</b>
                  </button>
                ))}
              </div>
              <button type="button" className={`halieus-theme-library-launch ${mode === "profile" || mode === "blue" || mode === "red" || mode === "green" ? "is-active" : ""}`} onClick={() => setLibraryOpen(true)}>
                <span className="halieus-theme-library-art" aria-hidden="true"><i /><i /><i /><i /></span>
                <span><strong>Theme Library</strong><small>{THEME_PROFILES.length} coordinated profiles</small></span>
                <b aria-hidden="true">→</b>
              </button>
              <button type="button" className={`halieus-theme-custom-launch ${mode === "custom" ? "is-active" : ""}`} onClick={openCustom}>
                <i aria-hidden="true">✦</i>
                <span><strong>Custom</strong><small>Open RGB / HEX controls immediately</small></span>
                <b aria-hidden="true">→</b>
              </button>
            </> : <>
              <button type="button" className="halieus-theme-library-back" onClick={() => setLibraryOpen(false)}>← Appearance</button>
              <div className="halieus-theme-library-grid">
                {THEME_PROFILE_GROUPS.map((group) => (
                  <Fragment key={group.id}>
                    <div className="halieus-theme-library-group">
                      <strong>{group.label}</strong>
                      <small>{group.description}</small>
                    </div>
                    {group.profiles.map((profile) => (
                      <button type="button" key={profile.id} className={mode === "profile" && profileId === profile.id ? "is-active" : ""} onClick={() => selectProfile(profile.id)}>
                        <span className="halieus-theme-profile-visual" aria-hidden="true">
                          <span className="halieus-theme-profile-swatch">
                            <i style={{ background: profile.theme.page }} />
                            <i style={{ background: profile.theme.surface }} />
                            <i style={{ background: profile.theme.accent }} />
                            <i style={{ background: profile.theme.secondary }} />
                          </span>
                          {profile.motif && <span className="halieus-theme-profile-motif">{profile.motif.map((colour) => <i key={colour} style={{ background: colour }} />)}</span>}
                        </span>
                        <span><em>{profile.mood}</em><strong>{profile.label}</strong><small>{profile.description}</small></span>
                        {mode === "profile" && profileId === profile.id && <b aria-hidden="true">✓</b>}
                      </button>
                    ))}
                  </Fragment>
                ))}
              </div>
            </>}
            <footer className="theme-preview-actions"><small>Preview only until you apply.</small><button type="button" className="button-outline" onClick={() => { cancelPreview(); setMenuOpen(false); }}>Cancel</button><button type="button" className="button-primary" onClick={applyPreview}>Apply theme</button></footer>
          </div>
        </div>,
        document.fullscreenElement ?? document.body,
      )}

      {editorOpen && createPortal(
        <div className="halieus-custom-theme-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && cancelCustom()}>
          <section ref={editorRef} className="halieus-custom-theme-dialog" role="dialog" aria-modal="true" aria-label="Custom HGR theme">
            <header>
              <div><p>CUSTOM THEME</p><h2>Build your own HGR palette</h2><span>Start from a coordinated palette or go completely custom. Games keep their identity while the shared HGR shell follows your colours.</span></div>
              <button type="button" onClick={cancelCustom} aria-label="Close custom theme editor">×</button>
            </header>
            <section className="halieus-custom-presets" aria-label="Custom theme presets">
              <header><strong>Starting palettes</strong><span>These are starting points, not locked themes. Change anything with RGB or HEX.</span></header>
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
            <div className="halieus-custom-theme-preview" style={{ background: draft.page, color: previewPageInk }}>
              <section className="halieus-custom-preview-window" style={{ background: draft.surface, color: previewSurfaceInk }}>
                <header><i style={{ background: draft.accent }} /><b style={{ color: previewSurfaceInk }}>HALIEUS GAME ROOM</b><em style={{ background: draft.secondary }} /></header>
                <div style={{ color: previewSurfaceInk }}><strong>Game night</strong><span style={{ borderColor: draft.accent, color: previewSurfaceInk }}>Primary action</span><small style={{ color: previewSurfaceMuted }}>Secondary accent</small></div>
              </section>
              <div className="halieus-custom-preview-palette" aria-label="Selected palette">
                {(["page", "surface", "accent", "secondary"] as Array<keyof HalieusCustomTheme>).map((key) => <span key={key}><i style={{ background: draft[key] }} /><code style={{ color: previewPageMuted }}>{draft[key].toUpperCase()}</code></span>)}
              </div>
              <small style={{ color: previewPageMuted }}>Live palette preview</small>
            </div>
            <footer>
              <button type="button" className="button-muted" onClick={() => setDraft({ ...DEFAULT_CUSTOM_THEME })}>Reset</button>
              <span />
              <button type="button" className="button-outline" onClick={cancelCustom}>Cancel</button>
              <button type="button" className="button-primary" onClick={applyCustom}>Apply custom theme</button>
            </footer>
          </section>
        </div>,
        document.fullscreenElement ?? document.body,
      )}
    </>
  );
}
