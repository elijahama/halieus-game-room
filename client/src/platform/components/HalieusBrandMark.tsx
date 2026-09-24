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
            d="M12 12h17v5h-4v12h14V17h-4v-5h17v5h-5v30h5v5H35v-5h4V35H25v12h4v5H12v-5h5V17h-5z"
          />
        </g>
      </svg>
    </span>
  );
}
