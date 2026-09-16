import { useEffect, useRef, useState, type CSSProperties } from "react";

interface HalieusIntroProps {
  onEnter: () => void;
}

const games = [
  { name: "Mega Board", code: "M", tone: "mega", state: "READY" },
  { name: "Poker", code: "P", tone: "poker", state: "READY" },
  { name: "WHOT", code: "W", tone: "whot", state: "READY" },
  { name: "Ludo", code: "L", tone: "ludo", state: "READY" },
  { name: "Blackjack", code: "21", tone: "blackjack", state: "READY" },
  { name: "Connect Four", code: "4", tone: "connect", state: "READY" },
  { name: "Hidden Dictator", code: "?", tone: "dictator", state: "BETA" },
] as const;

export function HalieusIntro({ onEnter }: HalieusIntroProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function enterGameRoom() {
    if (exiting) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onEnter();
      return;
    }
    setExiting(true);
    timerRef.current = window.setTimeout(onEnter, 560);
  }

  return (
    <main className={`halieus-intro ${exiting ? "is-exiting" : ""}`} aria-label="Enter Halieus Game Room">
      <div className="halieus-intro-grid" aria-hidden="true" />
      <div className="halieus-intro-ambient halieus-intro-ambient-a" />
      <div className="halieus-intro-ambient halieus-intro-ambient-b" />
      <div className="halieus-intro-ambient halieus-intro-ambient-c" />

      <section className="halieus-intro-stage">
        <div className="halieus-intro-copyblock">
          <div className="halieus-intro-brandline">
            <span className="halieus-intro-token-wrap" aria-hidden="true">
              <img className="halieus-intro-token" src="/app-icon-192.png?v=3.6.4" alt="" />
            </span>
            <span>
              <strong>HALIEUS</strong>
              <small>PRIVATE GAME ROOM</small>
            </span>
          </div>

          <p className="halieus-intro-eyebrow">YOUR TABLE. YOUR PEOPLE.</p>
          <h1>Game night,<br />built properly.</h1>
          <p className="halieus-intro-lede">
            Private multiplayer, owner-controlled accounts and seven games built for the same room.
          </p>

          <button
            ref={buttonRef}
            type="button"
            className="halieus-intro-enter"
            onClick={enterGameRoom}
            aria-label="Enter Halieus Game Room"
          >
            <span>Enter Halieus</span>
            <span aria-hidden="true">→</span>
          </button>
          <div className="halieus-intro-access-note">
            <span className="halieus-intro-lock" aria-hidden="true">◆</span>
            Invite-only accounts · Guest room links supported
          </div>
        </div>

        <div className="halieus-intro-library" aria-label="Available games">
          <div className="halieus-intro-library-head">
            <span>GAME LIBRARY</span>
            <strong>6 ready · 1 beta</strong>
          </div>
          <div className="halieus-intro-game-stack">
            {games.map((game, index) => (
              <div className={`halieus-intro-game halieus-intro-game-${game.tone}`} key={game.name} style={{ "--intro-order": index } as CSSProperties}>
                <span className="halieus-intro-game-mark">{game.code}</span>
                <span className="halieus-intro-game-name">{game.name}</span>
                <span className={`halieus-intro-game-state ${game.state === "BETA" ? "is-beta" : ""}`}>{game.state}</span>
              </div>
            ))}
          </div>
          <div className="halieus-intro-library-foot">
            <span>Private rooms</span><span>Live spectators</span><span>Game reports</span>
          </div>
        </div>
      </section>
    </main>
  );
}
