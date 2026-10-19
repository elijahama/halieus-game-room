import { useEffect, useState } from "react";
import { BETA_FONT_OPTIONS, readBetaFont, setBetaFont, type BetaFontId } from "../fontBeta";

export function BetaFontSelector() {
  const [selected, setSelected] = useState<BetaFontId>(readBetaFont);
  useEffect(() => {
    const sync = (event: Event) => setSelected((event as CustomEvent<BetaFontId>).detail);
    window.addEventListener("halieus-beta-font-change", sync);
    return () => window.removeEventListener("halieus-beta-font-change", sync);
  }, []);
  return (
    <section className="hgr-beta-font-lab" aria-labelledby="hgr-beta-font-heading">
      <div>
        <strong id="hgr-beta-font-heading">Website typography</strong>
        <p>Switch between the five liked Google Fonts. Your choice changes this Test Lab session only. Close this panel to inspect the site.</p>
      </div>
      <div className="hgr-beta-font-options" role="group" aria-label="Website font preview">
        {BETA_FONT_OPTIONS.map((font) => (
          <button type="button" key={font.id} aria-pressed={selected === font.id}
            className={selected === font.id ? "is-active" : ""}
            onClick={() => { setBetaFont(font.id); setSelected(font.id); }}>
            <span data-font-preview={font.id} aria-hidden="true">Halieus Aa 123</span>
            <strong>{font.label}</strong>
            <small>{font.note}</small>
          </button>
        ))}
      </div>
      <p className="hgr-beta-font-note">Testing at 320px, 360px, 390px, tablet and desktop sizes is recommended before selecting a default. Game-board microtext keeps its specialist font.</p>
    </section>
  );
}
