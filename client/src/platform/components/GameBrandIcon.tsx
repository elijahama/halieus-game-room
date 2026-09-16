import type { CSSProperties } from "react";

import { GAME_BY_ID, type GameId } from "../games/catalog";

export type GameBrand = GameId;

export function GameBrandIcon({ game, className = "" }: { game: GameBrand; className?: string }) {
  const entry = GAME_BY_ID[game];
  const publicFallback = `/game-icons/${game}.svg`;
  return (
    <img
      className={`halieus-game-brand-icon ${className}`.trim()}
      src={entry.icon}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={(event) => {
        const image = event.currentTarget;
        if (image.dataset.publicFallbackApplied === "true") return;
        image.dataset.publicFallbackApplied = "true";
        image.src = publicFallback;
      }}
      style={{ "--game-icon-accent": entry.accent } as CSSProperties}
    />
  );
}
