import { useEffect, useId, useState } from "react";
import { HGR_H_PATH, HGR_VIEWBOX, type HgrLogoPreset } from "../../../../shared/platform/brand";
import { readLogoPreset } from "../theme";

interface HalieusBrandMarkProps {
  preset?: HgrLogoPreset;
  className?: string;
  variant?: "standard" | "high" | "low";
}

export function HalieusBrandMark({ className = "", variant = "standard", preset }: HalieusBrandMarkProps) {
  const finishId = useId();
  const [savedPreset, setSavedPreset] = useState<HgrLogoPreset>(() => readLogoPreset());

  useEffect(() => {
    if (preset) return;
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<HgrLogoPreset>).detail;
      setSavedPreset(detail ?? readLogoPreset());
    };
    window.addEventListener("halieus-logo-preset", sync);
    return () => window.removeEventListener("halieus-logo-preset", sync);
  }, [preset]);

  const activePreset = preset ?? savedPreset;

  return (
    <span className={`halieus-brand-mark is-${variant} ${className}`.trim()} data-logo-preset={activePreset} aria-hidden="true">
      <svg viewBox={HGR_VIEWBOX} focusable="false">
        <defs>
          <linearGradient id={finishId} x2="0" y2="1">
            <stop offset="0" stopColor="color-mix(in srgb, var(--logo-bg) 86%, white)" />
            <stop offset=".22" stopColor="var(--logo-bg)" />
            <stop offset=".8" stopColor="var(--logo-bg)" />
            <stop offset="1" stopColor="color-mix(in srgb, var(--logo-bg) 78%, black)" />
          </linearGradient>
        </defs>
        <rect className="halieus-brand-mark-tile" x="3" y="3" width="58" height="58" rx="15" style={{ fill: `url(#${finishId})` }} />
        <g className="halieus-brand-mark-h">
          <path className="halieus-brand-mark-h-shape" fillRule="evenodd" d={HGR_H_PATH} />
        </g>
      </svg>
    </span>
  );
}
