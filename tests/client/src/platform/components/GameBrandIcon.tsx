import type { CSSProperties } from "react";

import { GAME_BY_ID, type GameId } from "../games/catalog";

export type GameBrand = GameId;

export function GameBrandIcon({ game, className = "" }: { game: GameBrand; className?: string }) {
  const entry = GAME_BY_ID[game];
  return <img className={`halieus-game-brand-icon ${className}`.trim()} src={entry.icon} alt="" aria-hidden="true" style={{ "--game-icon-accent": entry.accent } as CSSProperties} />;
}
