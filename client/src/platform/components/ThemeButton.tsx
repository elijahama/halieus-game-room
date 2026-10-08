import { CORE_LIBRARY_THEME_IDS, CORE_THEME_IDS, themeIsAvailable, themeUnlockLabel } from "../../../../shared/platform/themeProgression";
import { accountApi } from "../accounts/api";
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

function hslChannels(hex: string): [number, number, number] {
  const [red, green, blue] = rgbChannels(hex).map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(lightness * 100)];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = max === red
    ? (green - blue) / delta + (green < blue ? 6 : 0)
    : max === green
      ? (blue - red) / delta + 2
      : (red - green) / delta + 4;
  hue /= 6;
  return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(lightness * 100)];
}

function hslHex(channels: [number, number, number]): string {
  const hue = ((Number(channels[0]) % 360) + 360) % 360 / 360;
  const saturation = Math.max(0, Math.min(100, Number(channels[1]))) / 100;
  const lightness = Math.max(0, Math.min(100, Number(channels[2]))) / 100;
  if (saturation === 0) {
    const neutral = Math.round(lightness * 255);
    return rgbHex([neutral, neutral, neutral]);
  }
  const hueToRgb = (p: number, q: number, t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return rgbHex([
    hueToRgb(p, q, hue + 1 / 3) * 255,
    hueToRgb(p, q, hue) * 255,
    hueToRgb(p, q, hue - 1 / 3) * 255,
  ]);
}

function relativeLuminance(hex: string): number {
  const channels = rgbChannels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(left: string, right: string): number {
  const first = relativeLuminance(left);
  const second = relativeLuminance(right);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

const QUICK_OPTIONS: Array<{ mode: "system" | "light" | "dark"; icon: string; label: string; description: string }> = [
  { mode: "system", icon: "◐", label: "System", description: "Follow this device" },
  { mode: "light", icon: "○", label: "Light", description: "Standard bright HGR" },
  { mode: "dark", icon: "●", label: "Dark", description: "Standard graphite HGR" },
];

const VISIBLE_CORE_THEME_IDS = new Set<string>(CORE_LIBRARY_THEME_IDS);
const THEME_LIBRARY_GROUPS = [
  { id: "core", label: "Core", description: "Always available · animated palette atmospheres", profiles: THEME_PROFILES.filter((profile) => VISIBLE_CORE_THEME_IDS.has(profile.id)) },
  { id: "unlockable", label: "Unlockables", description: "Earned through verified play and achievements", profiles: THEME_PROFILES.filter((profile) => !CORE_THEME_IDS.includes(profile.id)) },
] as const;

export function ThemeButton({ background, colour, borderColour }: ThemeButtonProps) {
  const [entitlements, setEntitlements] = useState<string[]>(CORE_THEME_IDS);
  const [themeError, setThemeError] = useState("");
  const [applying, setApplying] = useState(false);
  const pending = useRef<ThemeSelection | null>(null);
  const [mode, setMode] = useState<HalieusThemeMode>(() => readThemeMode());
  const [profileId, setProfileId] = useState<HalieusThemeProfileId>(() => readThemeProfileId());
  const [custom, setCustom] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [draft, setDraft] = useState<HalieusCustomTheme>(() => readCustomTheme());
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [betaMode, setBetaMode] = useState(() => sessionStorage.getItem("halieus-beta-test-mode") === "1");

  useEffect(() => {
    const syncBetaMode = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setBetaMode(typeof detail === "boolean" ? detail : sessionStorage.getItem("halieus-beta-test-mode") === "1");
    };
    window.addEventListener("halieus-beta-mode", syncBetaMode);
    return () => window.removeEventListener("halieus-beta-mode", syncBetaMode);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    let live = true;
    setThemeError("");
    void accountApi<{entitlements:string[]}>("/accounts/me/themes").then(r=>{if(live)setEntitlements([...CORE_THEME_IDS, ...r.entitlements]);}).catch(()=>{if(live)setEntitlements(CORE_THEME_IDS);});
    return ()=>{live=false;};
  }, [menuOpen]);
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
  const workspaceTextContrast = contrastRatio(draft.page, previewPageInk);
  const panelTextContrast = contrastRatio(draft.surface, previewSurfaceInk);
  const workspacePanelContrast = contrastRatio(draft.page, draft.surface);
  const primaryPanelContrast = contrastRatio(draft.accent, draft.surface);

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
  async function applyPreview() {
    const next = pending.current;
    setApplying(true); setThemeError("");
    try {
      if (next?.mode === "profile" && !CORE_THEME_IDS.includes(next.profile) && !betaMode) {
        await accountApi("/accounts/me/themes", {method:"POST",body:JSON.stringify({id:next.profile})});
      }
      // Closing/cancelling while a request is in flight must not commit a stale preview.
      if (pending.current !== next) return;
      if (next) commitTheme(next);
      pending.current = null; setMenuOpen(false); setEditorOpen(false);
    } catch(e) { setThemeError(e instanceof Error ? e.message : "Unable to apply theme."); }
    finally { setApplying(false); }
  }
  useEffect(() => { if (!menuOpen && !editorOpen && pending.current) cancelPreview(); }, [menuOpen, editorOpen]);
  useEffect(() => () => { if (pending.current) previewTheme(committedTheme()); }, []);
  useEffect(() => { if (editorOpen) preview({ ...committedTheme(), mode: "custom", custom: draft }); }, [draft, editorOpen]);
  function selectMode(next: "system" | "light" | "dark") {
    preview({ ...committedTheme(), mode: next });
  }
  function selectProfile(id: HalieusThemeProfileId) {
    if (!themeIsAvailable(id, entitlements, betaMode)) return;
    preview({ ...committedTheme(), mode: "profile", profile: id });
  }

  function openCustom() {
    setDraft({ ...committedTheme().custom });
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

  function updateHslChannel(key: keyof HalieusCustomTheme, channelIndex: number, value: number) {
    const channels = hslChannels(draft[key]);
    channels[channelIndex] = Number.isFinite(value) ? value : channels[channelIndex];
    updateDraftColour(key, hslHex(channels));
  }

  function applyCustom() { commitTheme({ ...committedTheme(), mode: "custom", custom: draft }); pending.current = null; setEditorOpen(false); }

  function cancelCustom() {
    setDraft({ ...committedTheme().custom });
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
            <header><span>{libraryOpen ? "Theme Library" : "Appearance"}</span><small>{libraryOpen ? "Core palettes and progression unlockables" : "Fast defaults, library or your own palette"}</small><button type="button" className="appearance-close" aria-label="Close appearance" onClick={() => { cancelPreview(); setMenuOpen(false); }}>×</button></header>

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
              <button type="button" className={`halieus-theme-library-launch ${mode === "profile" || mode === "custom" || mode === "blue" || mode === "red" || mode === "green" ? "is-active" : ""}`} onClick={() => setLibraryOpen(true)}>
                <span className="halieus-theme-library-art" aria-hidden="true"><i /><i /><i /><i /></span>
                <span><strong>Theme Library</strong><small>{THEME_PROFILES.length} core + progression palettes</small></span>
                <b aria-hidden="true">→</b>
              </button>
              <button type="button" className={`halieus-theme-custom-launch ${mode === "custom" ? "is-active" : ""}`} onClick={openCustom}>
                <i aria-hidden="true">✦</i>
                <span><strong>Custom</strong><small>Open RGB / HSL sliders immediately</small></span>
                <b aria-hidden="true">→</b>
              </button>
            </> : <>
              <button type="button" className="halieus-theme-library-back" onClick={() => setLibraryOpen(false)}>← Appearance</button>
              <button type="button" className="theme-custom-always" onClick={openCustom}>Edit workspace palette · RGB / HSL</button>
              <div className="halieus-theme-library-grid">
                {THEME_LIBRARY_GROUPS.map((group) => (
                  <Fragment key={group.id}>
                    <div className="halieus-theme-library-group">
                      <strong>{group.label}</strong>
                      <small>{group.description}</small>
                    </div>
                    {group.profiles.map((profile) => (
                      <button type="button" key={profile.id} disabled={!themeIsAvailable(profile.id, entitlements, betaMode)} aria-label={`${profile.label} · ${themeUnlockLabel(profile.id)}`} className={`${mode === "profile" && profileId === profile.id ? "is-active" : ""}${betaMode && !entitlements.includes(profile.id) ? " is-beta-unlocked" : ""}`.trim()} onClick={() => selectProfile(profile.id)}>
                        <span className="halieus-theme-profile-visual" aria-hidden="true">
                          <span className="halieus-theme-profile-swatch">
                            <i style={{ background: profile.theme.page }} />
                            <i style={{ background: profile.theme.surface }} />
                            <i style={{ background: profile.theme.accent }} />
                            <i style={{ background: profile.theme.secondary }} />
                          </span>
                          {profile.motif && <span className="halieus-theme-profile-motif">{profile.motif.map((colour) => <i key={colour} style={{ background: colour }} />)}</span>}
                        </span>
                        <span><em>{profile.mood}</em><strong>{profile.label}</strong><small>{profile.description}</small><small className="theme-unlock-condition">{betaMode && !entitlements.includes(profile.id) ? `Beta access · Normally: ${themeUnlockLabel(profile.id)}` : entitlements.includes(profile.id) ? (CORE_THEME_IDS.includes(profile.id) ? "Core · always available" : "Unlocked") : `Locked · ${themeUnlockLabel(profile.id)}`}</small></span>
                        {mode === "profile" && profileId === profile.id && <b aria-hidden="true">✓</b>}
                      </button>
                    ))}
                  </Fragment>
                ))}
              </div>
            </>}
            {themeError && <p role="status">{themeError}</p>}
            <footer className="theme-preview-actions"><small>Preview only until you apply.</small><button type="button" className="button-outline" onClick={() => { cancelPreview(); setMenuOpen(false); }}>Cancel</button><button type="button" className="button-primary" disabled={applying} onClick={() => void applyPreview()}>{applying ? "Applying…" : "Apply theme"}</button></footer>
          </div>
        </div>,
        document.fullscreenElement ?? document.body,
      )}

      {editorOpen && createPortal(
        <div className="halieus-custom-theme-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && cancelCustom()}>
          <section ref={editorRef} className="halieus-custom-theme-dialog" role="dialog" aria-modal="true" aria-label="Custom HGR theme">
            <header>
              <div><p>CUSTOM THEME</p><h2>Build your own HGR palette</h2><span>Tune the four shared HGR colours with RGB or HSL. Games keep their identity while the platform shell follows this palette.</span></div>
              <button type="button" onClick={cancelCustom} aria-label="Close custom theme editor">×</button>
            </header>
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
                    <span className="halieus-custom-colour-swatch" style={{ background: draft[key] }} aria-hidden="true" />
                    <small>{label} colour</small>
                  </div>
                  <div className="halieus-rgb-fields" aria-label={`${label} RGB channels`}>
                    {rgbChannels(draft[key]).map((channel, channelIndex) => (
                      <label key={channelIndex}>
                        <b>{["R", "G", "B"][channelIndex]}</b>
                        <input type="range" min={0} max={255} value={channel} onChange={(event) => updateRgbChannel(key, channelIndex, Number(event.target.value))} aria-label={`${label} ${["red", "green", "blue"][channelIndex]} channel`} />
                        <output>{channel}</output>
                      </label>
                    ))}
                  </div>
                  <div className="halieus-custom-channel-heading">
                    <small>Hue · saturation · lightness</small>
                    <button type="button" onClick={() => updateHslChannel(key, 1, 0)}>Greyscale</button>
                  </div>
                  <div className="halieus-hsl-fields" aria-label={`${label} HSL channels`}>
                    {hslChannels(draft[key]).map((channel, channelIndex) => (
                      <label key={channelIndex}>
                        <b>{["H", "S", "L"][channelIndex]}</b>
                        <input
                          type="range"
                          min={0}
                          max={channelIndex === 0 ? 360 : 100}
                          value={channel}
                          onChange={(event) => updateHslChannel(key, channelIndex, Number(event.target.value))}
                          aria-label={`${label} ${["hue", "saturation", "lightness"][channelIndex]}`}
                        />
                        <output>{channel}{channelIndex === 0 ? "°" : "%"}</output>
                      </label>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="halieus-custom-theme-preview" style={{ background: draft.page, color: previewPageInk }}>
              <section className="halieus-custom-preview-window" style={{ background: draft.surface, color: previewSurfaceInk }}>
                <header><i style={{ background: draft.accent }} /><b style={{ color: previewSurfaceInk }}>HALIEUS GAME ROOM</b><em style={{ background: draft.secondary }} /></header>
                <div style={{ color: previewSurfaceInk }}><strong>Main-site preview</strong><span style={{ borderColor: draft.accent, color: previewSurfaceInk }}>Primary action</span><small style={{ color: previewSurfaceMuted }}>Panels use your surface colour</small></div>
              </section>
              <div className="halieus-custom-preview-legend" aria-label="Main site colour legend">
                {([
                  ["page", "Workspace"],
                  ["surface", "Panels"],
                  ["accent", "Primary"],
                  ["secondary", "Secondary"],
                ] as Array<[keyof HalieusCustomTheme, string]>).map(([key, legendLabel]) => <span key={key}><i style={{ background: draft[key] }} /><b>{legendLabel}</b></span>)}
              </div>
              <div className="halieus-custom-contrast-guide" aria-label="Contrast guide">
                <span><small>Workspace text</small><strong>{workspaceTextContrast.toFixed(1)}:1</strong></span>
                <span><small>Panel text</small><strong>{panelTextContrast.toFixed(1)}:1</strong></span>
                <span><small>Workspace / panel</small><strong>{workspacePanelContrast.toFixed(1)}:1</strong></span>
                <span><small>Primary / panel</small><strong>{primaryPanelContrast.toFixed(1)}:1</strong></span>
              </div>
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
