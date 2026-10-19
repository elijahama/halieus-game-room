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
        <p>The owner-reviewed Balanced HGR mix is now the normal site treatment. Compare it with each individual font in this Test Lab session; close this panel to inspect games and navigation.</p>
      </div>
      <div className="hgr-beta-font-options" role="group" aria-label="Website font preview">
        {BETA_FONT_OPTIONS.map((font) => (
          <button type="button" key={font.id} aria-pressed={selected === font.id}
            className={selected === font.id ? "is-active" : ""}
            onClick={() => { setBetaFont(font.id); setSelected(font.id); }}>
            {font.id === "balanced" ? (
              <span className="hgr-beta-balanced-preview" aria-hidden="true"><b>Halieus</b><i>Game Night</i><em>Ready to play</em><small>Players · Rooms</small></span>
            ) : <span data-font-preview={font.id} aria-hidden="true">Halieus Aa 123</span>}
            <strong>{font.label}</strong>
            <small>{font.note}</small>
          </button>
        ))}
      </div>
      <p className="hgr-beta-font-note">Balanced HGR follows your initial font-role decisions, not a final visual sign-off. Test it at 320px, 360px, 390px, tablet and desktop widths; specialist board microtext is unchanged.</p>
    </section>
  );
}
