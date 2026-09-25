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
          <path
            className="halieus-brand-mark-h-shape"
            d="M17 15h10v12h10V15h10v34H37V36H27v13H17z"
          />
        </g>
      </svg>
    </span>
  );
}
