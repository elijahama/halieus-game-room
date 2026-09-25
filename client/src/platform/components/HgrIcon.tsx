import type { SVGProps } from "react";

export type HgrIconName =
  | "home"
  | "games"
  | "players"
  | "guilds"
  | "leaderboard"
  | "settings"
  | "inbox"
  | "chat"
  | "plus"
  | "info"
  | "menu"
  | "fullscreen"
  | "minimize"
  | "close"
  | "chevron-left"
  | "chevron-right";

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
      return <svg {...common}><path d="M7.3 7.5h9.4c2.3 0 3.8 1.5 4.2 4l.8 4.6c.4 2.2-1.7 3.6-3.4 2.1l-2.2-2h-8.2l-2.2 2c-1.7 1.5-3.8.1-3.4-2.1l.8-4.6c.4-2.5 1.9-4 4.2-4z" /><path d="M7.2 11v4M5.2 13h4" /><path d="M16.8 11.7h.01M18.8 14.1h.01" /></svg>;
    case "players":
      return <svg {...common}><circle cx="8.5" cy="8" r="3" /><circle cx="16.6" cy="9.1" r="2.5" /><path d="M3.5 19.5c.7-3.4 2.4-5.1 5-5.1s4.3 1.7 5 5.1" /><path d="M13.2 15.1c1-.8 2.1-1.2 3.4-1.2 2.2 0 3.6 1.5 4 4.5" /></svg>;
    case "guilds":
      return <svg {...common}><path d="M12 3.5 19 6v5.4c0 4.3-2.7 7.2-7 9.1-4.3-1.9-7-4.8-7-9.1V6l7-2.5z" /><circle cx="12" cy="9.2" r="2.1" /><path d="M8.8 15.2c.7-1.8 1.7-2.7 3.2-2.7s2.5.9 3.2 2.7" /></svg>;
    case "leaderboard":
      return <svg {...common}><path d="M8 4h8v3.2c0 3-1.7 5-4 5s-4-2-4-5V4z" /><path d="M8 6H4.5c0 3.1 1.5 4.7 4.2 4.8M16 6h3.5c0 3.1-1.5 4.7-4.2 4.8M12 12.5V17M8.5 20h7M9.5 17h5" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 3.7v2.1M12 18.2v2.1M20.3 12h-2.1M5.8 12H3.7M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5M17.9 17.9l-1.5-1.5M7.6 7.6 6.1 6.1" /><circle cx="12" cy="12" r="7.3" /></svg>;
    case "inbox":
      return <svg {...common}><path d="M4 5.5h16v13H4z" /><path d="M4 14h4l1.7 2h4.6l1.7-2h4" /></svg>;
    case "chat":
      return <svg {...common}><path d="M5 5.5h14v10.5H10l-5 3v-13.5z" /><path d="M8.3 10.8h.01M12 10.8h.01M15.7 10.8h.01" /></svg>;
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
    case "chevron-left":
      return <svg {...common}><path d="m14.5 6-6 6 6 6" /></svg>;
    case "chevron-right":
      return <svg {...common}><path d="m9.5 6 6 6-6 6" /></svg>;
  }
}
