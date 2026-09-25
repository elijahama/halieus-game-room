import { HGR_H_PATH, HGR_VIEWBOX, type HgrLogoPreset } from "../../../../shared/platform/brand";
interface HalieusBrandMarkProps {
  preset?: HgrLogoPreset;
  className?: string;
  variant?: "standard" | "high" | "low";
}

export function HalieusBrandMark({ className = "", variant = "standard", preset = "brand" }: HalieusBrandMarkProps) {
  return (
    <span className={`halieus-brand-mark is-${variant} ${className}`.trim()} data-logo-preset={preset} aria-hidden="true">
      <svg viewBox={HGR_VIEWBOX} focusable="false">
        <rect className="halieus-brand-mark-tile" x="3" y="3" width="58" height="58" rx="15" />
        <g className="halieus-brand-mark-h">
          <path
            className="halieus-brand-mark-h-shape"
            fillRule="evenodd" d={HGR_H_PATH}
          />
        </g>
      </svg>
    </span>
  );
}
