import { useRef, type CSSProperties, type ReactNode } from "react";
import { GameBrandIcon } from "./GameBrandIcon";
import { useModalLifecycle } from "./useModalLifecycle";
import { GAME_BY_ID, type GameId } from "../games/catalog";
/** Shared structure; each game retains ownership of its settings and create payload. */
export function PreGameShell({ game, onClose, children, style }: { game: GameId; onClose: () => void; children: ReactNode; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useModalLifecycle(true, ref, onClose);
  const entry = GAME_BY_ID[game];
  return <section ref={ref} className="halieus-create-panel halieus-create-modal pre-game-shell panel-enter" style={style} role="dialog" aria-modal="true" aria-label={`Create ${entry.name} room`}>
    <header className="halieus-create-modal-head"><div className="halieus-create-brand"><GameBrandIcon game={game}/><div><p>{entry.name.toUpperCase()}</p><h2>Create {game === "poker" || game === "blackjack" ? "a table" : "a room"}</h2><span>{entry.subtitle}</span></div></div><button type="button" className="halieus-create-close" onClick={onClose} aria-label="Close room setup">×</button></header>
    {children}
  </section>;
}
