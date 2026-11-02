import type { GameState } from "../../../../../shared/games/mega-board/game-state";

interface Props {
  gameState: GameState;
  followedId: string | null;
  onFollow: (id: string | null) => void;
}
export function SpectatorControls({gameState,followedId,onFollow}:Props) {
  const active = gameState.players.filter(p=>!p.isBankrupt);
  const current = gameState.players[gameState.currentPlayerIndex];
  const followed = active.find(p=>p.id===followedId);
  const phase = gameState.turnPhase === "roll" ? "Rolling" :
    gameState.turnPhase === "optional-actions" ? "Playing" : "Resolving a decision";
  return (
    <div className="mega-spectator-controls" aria-label="Live match spectator tools">
      <div className="mega-spectator-current" role="status" aria-live="polite">
        <b>{current?.name ?? "Match"}</b>
        <span>{current ? phase : "Waiting for a turn"} · {active.length} active players</span>
        {followed && <span className="mega-spectator-followed">
          Following {followed.name} · £{followed.cash.toLocaleString()} · {followed.properties.length} properties
        </span>}
      </div>
      <div className="mega-spectator-follow-list" role="group" aria-label="Follow a player">
        <button type="button" aria-pressed={followedId === null} onClick={()=>onFollow(null)}>All players</button>
        {active.map(player=><button type="button" key={player.id}
          className={followedId===player.id?"is-followed":undefined}
          aria-pressed={followedId===player.id}
          onClick={()=>onFollow(player.id)} title={`Follow ${player.name} in the live roster`}>
          <i aria-hidden="true" style={{background:player.colour}} />
          {player.name}{player.id===current?.id?" · Turn":""}
        </button>)}
      </div>
    </div>
  );
}
