import { CORE_THEME_IDS, themeIsAvailable, themeUnlockLabel } from "../../../../shared/platform/themeProgression";
import { accountApi } from "../accounts/api";
import { useModalLifecycle } from "./useModalLifecycle";
import { committedTheme, previewTheme, commitTheme, type ThemeSelection } from "../themePreview";
import { useEffect, useRef, useState } from "react";
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

const QUICK_OPTIONS: Array<{ mode: "system" | "light" | "dark"; icon: string; label: string; description: string }> = [
  { mode: "system", icon: "◐", label: "System", description: "Follow this device" },
  { mode: "light", icon: "○", label: "Light", description: "Standard bright HGR" },
  { mode: "dark", icon: "●", label: "Dark", description: "Standard graphite HGR" },
];

const UNLOCKABLE_THEME_PROFILES = THEME_PROFILES.filter((profile) => !CORE_THEME_IDS.includes(profile.id));

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
            <header><span>{libraryOpen ? "Theme Library" : "Appearance"}</span><small>{libraryOpen ? "One palette engine · starting, unlockable, core and workspace palettes" : "Fast defaults, library or your own palette"}</small><button type="button" className="appearance-close" aria-label="Close appearance" onClick={() => { cancelPreview(); setMenuOpen(false); }}>×</button></header>

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
                <span><strong>Theme Library</strong><small>{UNLOCKABLE_THEME_PROFILES.length} progression palettes</small></span>
                <b aria-hidden="true">→</b>
              </button>
              <button type="button" className={`halieus-theme-custom-launch ${mode === "custom" ? "is-active" : ""}`} onClick={openCustom}>
                <i aria-hidden="true">✦</i>
                <span><strong>Custom</strong><small>Open RGB sliders immediately</small></span>
                <b aria-hidden="true">→</b>
              </button>
            </> : <>
              <button type="button" className="halieus-theme-library-back" onClick={() => setLibraryOpen(false)}>← Appearance</button>
              <button type="button" className="theme-custom-always" onClick={openCustom}>Edit workspace palette · RGB sliders</button>
              <div className="halieus-theme-library-grid">
                <div className="halieus-theme-library-group">
                  <strong>Unlockables</strong>
                  <small>Earned through verified play and achievements</small>
                </div>
                {UNLOCKABLE_THEME_PROFILES.map((profile) => (
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
                    <span><em>{profile.mood}</em><strong>{profile.label}</strong><small>{profile.description}</small><small className="theme-unlock-condition">{betaMode && !entitlements.includes(profile.id) ? `Beta access · Normally: ${themeUnlockLabel(profile.id)}` : entitlements.includes(profile.id) ? "Unlocked" : `Locked · ${themeUnlockLabel(profile.id)}`}</small></span>
                    {mode === "profile" && profileId === profile.id && <b aria-hidden="true">✓</b>}
                  </button>
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
              <div><p>CUSTOM THEME</p><h2>Build your own HGR palette</h2><span>Tune the four shared HGR colours directly. Games keep their identity while the platform shell follows this palette.</span></div>
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
