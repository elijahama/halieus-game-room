interface HalieusBrandMarkProps {
  className?: string;
  variant?: "standard" | "high" | "low";
}

export function HalieusBrandMark({ className = "", variant = "standard" }: HalieusBrandMarkProps) {
  return (
    <span className={`halieus-brand-mark is-${variant} ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <rect className="halieus-brand-mark-tile" x="3" y="3" width="58" height="58" rx="15" />
        <g className="halieus-brand-mark-h">
          <path className="halieus-brand-mark-h-pillar is-left" d="M12 10h13v16l7 6-7 6v16H12z" />
          <path className="halieus-brand-mark-h-pillar is-right" d="M52 10H39v16l-7 6 7 6v16h13z" />
          <path className="halieus-brand-mark-h-bridge" d="M21 26h22l-5 6 5 6H21l5-6z" />
        </g>
      </svg>
    </span>
  );
}
