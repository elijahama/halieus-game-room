interface MegaTokenGlyphProps {
  tokenId?: string | null;
  fallback?: string;
  className?: string;
}

const EMOJI_TOKENS: Record<string, string> = {
  "top-hat": "🎩",
  car: "🚗",
  ship: "🚢",
  dog: "🐕",
  cat: "🐈",
  boot: "🥾",
  "t-rex": "🦖",
  duck: "🦆",
};

function WheelbarrowIcon() {
  return (
    <svg className="mega-token-svg" viewBox="0 0 64 64" aria-hidden="true">
      <g fill="currentColor" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Deep single-wheel tray with long rear handles: deliberately not a shopping trolley/cart. */}
        <path d="M17 20h31L40 39H23z" />
        <path d="M21 39L12 50" fill="none" />
        <path d="M39 39L54 50" fill="none" />
        <path d="M45 23L55 14" fill="none" />
        <path d="M53 14h7" fill="none" />
        <circle cx="17" cy="50" r="7" />
        <circle cx="17" cy="50" r="2.2" fill="none" strokeWidth="2" />
      </g>
    </svg>
  );
}

function ThimbleIcon() {
  return (
    <svg className="mega-token-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M19 47c2-15 2-28 13-31 11 3 11 16 13 31z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M15 47h34v7H15z" fill="currentColor" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <g fill="#fff" opacity=".48">
        <circle cx="27" cy="25" r="1.7"/><circle cx="34" cy="24" r="1.7"/><circle cx="40" cy="28" r="1.7"/>
        <circle cx="25" cy="32" r="1.7"/><circle cx="32" cy="31" r="1.7"/><circle cx="39" cy="34" r="1.7"/>
        <circle cx="24" cy="39" r="1.7"/><circle cx="31" cy="38" r="1.7"/><circle cx="38" cy="41" r="1.7"/>
      </g>
    </svg>
  );
}

export function MegaTokenGlyph({ tokenId, fallback = "?", className = "" }: MegaTokenGlyphProps) {
  const classes = `mega-token-glyph ${className}`.trim();
  if (tokenId === "wheelbarrow") return <span className={classes}><WheelbarrowIcon /></span>;
  if (tokenId === "thimble") return <span className={classes}><ThimbleIcon /></span>;
  return <span className={classes}>{tokenId ? EMOJI_TOKENS[tokenId] ?? fallback : fallback}</span>;
}
