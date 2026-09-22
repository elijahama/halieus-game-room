import type { SVGProps } from "react";

export type HgrIconName =
  | "home"
  | "games"
  | "players"
  | "plus"
  | "info"
  | "menu"
  | "fullscreen"
  | "minimize"
  | "close";

interface HgrIconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: HgrIconName;
  size?: number;
}

export function HgrIcon({ name, size = 20, ...props }: HgrIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="M3.5 10.5 12 3.8l8.5 6.7" /><path d="M5.5 9.7V20h13V9.7" /><path d="M9.5 20v-6h5v6" /></svg>;
    case "games":
      return <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></svg>;
    case "players":
      return <svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.8 19.5c.8-3.5 2.6-5.2 5.2-5.2s4.4 1.7 5.2 5.2" /><path d="M15.7 6.2a3 3 0 0 1 0 5.8" /><path d="M16.5 14.5c2.1.5 3.3 2.1 3.7 5" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 10.7v6.1" /><path d="M12 7.2h.01" /></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "fullscreen":
      return <svg {...common}><path d="M8.5 4H4v4.5M15.5 4H20v4.5M8.5 20H4v-4.5M15.5 20H20v-4.5" /></svg>;
    case "minimize":
      return <svg {...common}><path d="M9 4v5H4M15 20v-5h5M20 9h-5V4M4 15h5v5" /></svg>;
    case "close":
      return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  }
}
