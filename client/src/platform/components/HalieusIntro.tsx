import { useCallback, useEffect, useRef, useState } from "react";

interface HalieusIntroProps {
  displayName?: string | null;
  onEnter: () => void;
}

const AUTO_ENTER_MS = 3200;
const EXIT_MS = 520;

/**
 * 4.0.x branded arrival screen.
 *
 * The parent decides when the intro is eligible so direct room links and live
 * recovery routes are never blocked by presentation. The intro itself stays
 * deliberately short: it can be skipped immediately and otherwise advances
 * automatically after a few seconds.
 */
export function HalieusIntro({ displayName, onEnter }: HalieusIntroProps) {
  const [exiting, setExiting] = useState(false);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const finishIntro = useCallback(() => {
    setExiting(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(finishIntro, AUTO_ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [finishIntro]);

  // Own the exit timer in a separate effect. Starting the fade must never
  // cancel completion, including during parent clock/socket renders.
  useEffect(() => {
    if (!exiting) return;
    const delay = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : EXIT_MS;
    const timer = window.setTimeout(() => onEnterRef.current(), delay);
    return () => window.clearTimeout(timer);
  }, [exiting]);

  return (
    <main
      className={`halieus-intro halieus-intro-v4 ${exiting ? "is-exiting" : ""}`}
      aria-label="Welcome to Halieus Game Room"
    >
      <div className="halieus-intro-grid" aria-hidden="true" />
      <div className="halieus-intro-ambient halieus-intro-ambient-a" aria-hidden="true" />
      <div className="halieus-intro-ambient halieus-intro-ambient-b" aria-hidden="true" />
      <div className="halieus-intro-ambient halieus-intro-ambient-c" aria-hidden="true" />

      <button type="button" autoFocus className="halieus-intro-skip" onClick={finishIntro}>
        Skip intro
      </button>

      <section className="halieus-intro-v4-card">
        <span className="halieus-intro-v4-logo" aria-hidden="true">
          <img src="/app-icon-192.png?v=4.0.2" alt="" />
        </span>

        <p className="halieus-intro-v4-kicker">
          {displayName ? `WELCOME BACK, ${displayName.toUpperCase()}` : "WELCOME"}
        </p>
        <h1>Welcome to<br />Halieus Game Room</h1>
        <p className="halieus-intro-v4-lede">
          Your games. Your people. One room.
        </p>

        <button type="button" className="halieus-intro-v4-enter" onClick={finishIntro}>
          <span>Enter Game Room</span>
          <span aria-hidden="true">→</span>
        </button>

        <div className="halieus-intro-v4-meta" aria-label="Platform highlights">
          <span>Private multiplayer</span>
          <span>Live rooms</span>
          <span>14 games</span>
        </div>

        <div className="halieus-intro-v4-progress" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}
