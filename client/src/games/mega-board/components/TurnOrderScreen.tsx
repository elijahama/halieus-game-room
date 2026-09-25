import { useEffect, useRef, useState } from "react";
import type { GameState } from "../../../../../shared/games/mega-board/game-state";
import type { LobbyState } from "../types/lobby";
import { styles } from "../styles/gameStyles";
import { BackToGameRoomButton } from "../../../platform/components/BackToGameRoomButton";

import { MegaTokenGlyph } from "./MegaTokenGlyph";

const MEGA_ACCENT = "#16a34a";

interface TurnOrderScreenProps {
  lobby: LobbyState;
  gameState: GameState;
  message: string;
  darkMode: boolean;
  theme: {
    pageBackground: string;
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onToggleDarkMode: () => void;
  onOrderRoll: () => void;
  onSelectToken: (tokenId: string) => void;
  onOpenMenu: () => void;
  onBackToGameRoom: () => void;
}


const BOARD_TOKENS = [
  {id:"top-hat",glyph:"🎩",label:"Top Hat"},
  {id:"car",glyph:"🚗",label:"Car"},
  {id:"ship",glyph:"🚢",label:"Ship"},
  {id:"dog",glyph:"🐕",label:"Dog"},
  {id:"cat",glyph:"🐈",label:"Cat"},
  {id:"boot",glyph:"🥾",label:"Boot"},
  {id:"thimble",glyph:"",label:"Thimble"},
  {id:"wheelbarrow",glyph:"",label:"Wheelbarrow"},
  {id:"t-rex",glyph:"🦖",label:"T-Rex"},
  {id:"duck",glyph:"🦆",label:"Duck"},
];

function makeDiceForTotal(total: number): [number, number] {
  const first = Math.max(1, Math.min(6, total - 1));
  return [first, Math.max(1, Math.min(6, total - first))];
}

function OrderRollDice({
  total,
  rollCount,
  forceRolling = false,
}: {
  total?: number;
  rollCount: number;
  forceRolling?: boolean;
}) {
  const [values, setValues] = useState<[number, number]>(() =>
    total ? makeDiceForTotal(total) : [1, 1],
  );
  const [rolling, setRolling] = useState(forceRolling);
  const previousCount = useRef(rollCount);
  const cycleRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);

  const stopTimers = () => {
    if (cycleRef.current) {
      window.clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
    if (settleRef.current) {
      window.clearTimeout(settleRef.current);
      settleRef.current = null;
    }
  };

  const startCycle = () => {
    if (cycleRef.current) {
      return;
    }
    setRolling(true);
    cycleRef.current = window.setInterval(() => {
      setValues([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 85);
  };

  useEffect(() => {
    if (forceRolling) {
      startCycle();
      return;
    }

    if (cycleRef.current) {
      window.clearInterval(cycleRef.current);
      cycleRef.current = null;
    }

    if (total) {
      setValues(makeDiceForTotal(total));
    }
    setRolling(false);
  }, [forceRolling, total]);

  useEffect(() => {
    const countIncreased = rollCount > previousCount.current;
    previousCount.current = rollCount;

    if (!countIncreased || !total || forceRolling) {
      return;
    }

    startCycle();
    settleRef.current = window.setTimeout(() => {
      if (cycleRef.current) {
        window.clearInterval(cycleRef.current);
        cycleRef.current = null;
      }
      setValues(makeDiceForTotal(total));
      setRolling(false);
      settleRef.current = null;
    }, 1100);
  }, [rollCount, total, forceRolling]);

  useEffect(() => () => stopTimers(), []);

  if (!total && !rolling) {
    return null;
  }

  const faces = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  return (
    <div
      className={`order-roll-dice ${rolling ? "is-rolling" : ""}`}
      aria-label={rolling ? "Dice rolling" : `Rolled ${total ?? ""}`}
    >
      <span>{faces[values[0]]}</span>
      <span>{faces[values[1]]}</span>
      <strong>{rolling ? "Rolling…" : total}</strong>
    </div>
  );
}

export function TurnOrderScreen({
  lobby,
  gameState,
  message,
  darkMode,
  theme,
  onToggleDarkMode,
  onOrderRoll,
  onSelectToken,
  onOpenMenu,
  onBackToGameRoom,
}: TurnOrderScreenProps) {
  const currentGamePlayer = gameState.players.find(
    (player) => player.id === lobby.playerId,
  );
  const ownOrderRollCount = currentGamePlayer?.orderRolls.length ?? 0;
  const [localRollAnimating, setLocalRollAnimating] = useState(false);
  const requestedAtRollCount = useRef(ownOrderRollCount);

  useEffect(() => {
    if (!localRollAnimating || ownOrderRollCount <= requestedAtRollCount.current) {
      return;
    }

    const settle = window.setTimeout(() => setLocalRollAnimating(false), 1150);
    return () => window.clearTimeout(settle);
  }, [localRollAnimating, ownOrderRollCount]);

  const requestOrderRoll = () => {
    requestedAtRollCount.current = ownOrderRollCount;
    setLocalRollAnimating(true);
    onOrderRoll();
  };
  const activeRollerId =
    gameState.orderRollEligiblePlayerIds.find(
      (playerId) =>
        !gameState.orderRollCompletedPlayerIds.includes(playerId),
    );
  const activeRoller = gameState.players.find((player) => player.id === activeRollerId);
  const isEligible = currentGamePlayer
    ? currentGamePlayer.id === activeRollerId
    : false;
  const hasRolled = currentGamePlayer
    ? gameState.orderRollCompletedPlayerIds.includes(currentGamePlayer.id)
    : false;
  const waitingForPlayers = gameState.players.filter(
    (player) =>
      gameState.orderRollEligiblePlayerIds.includes(player.id) &&
      !gameState.orderRollCompletedPlayerIds.includes(player.id),
  );

  return (
    <main
      className="mega-ordering-page"
      style={{
        ...styles.gamePage,
        background: theme.pageBackground,
        color: theme.text,
      }}
    >

      {/* Shared top-level navigation keeps the setup phase escapable without turning "back" into a forfeit. */}
      <div className="ordering-top-actions">
        <BackToGameRoomButton onClick={onBackToGameRoom} />
        <button
          type="button"
          className="ordering-menu-button"
          onClick={onOpenMenu}
        >
          ☰ Game menu
        </button>
      </div>

      <section
        className="ordering-card page-enter"
        style={{
          ...styles.orderingCard,
          background: theme.cardBackground,
          borderColor: theme.border,
        }}
      >
        <p style={{ ...styles.eyebrow, color: MEGA_ACCENT }}>Mega Board setup</p>
        <h1 style={styles.title}>Determine Turn Order</h1>
        <p style={{ ...styles.orderingIntro, color: theme.mutedText }}>
          Everyone rolls two dice. The highest result goes first. Tied players
          roll again.
        </p>

        {currentGamePlayer && !currentGamePlayer.isAi && (
          <section className="mega-token-picker" aria-label="Choose your board piece">
            <div><span>Choose your piece</span><small>Pick a token before the turn-order roll finishes.</small></div>
            <div className="mega-token-options">{BOARD_TOKENS.map((token) => {
              const taken = gameState.players.some((player) => player.id !== currentGamePlayer.id && !player.isAi && player.tokenId === token.id);
              return <button key={token.id} type="button" className={currentGamePlayer.tokenId === token.id ? "is-selected" : ""} disabled={taken} onClick={() => onSelectToken(token.id)} title={taken ? `${token.label} is already taken` : token.label}><b><MegaTokenGlyph tokenId={token.id} fallback={token.glyph} /></b><span>{token.label}</span></button>;
            })}</div>
          </section>
        )}

        <div
          style={{
            ...styles.orderingRoundBox,
            background: theme.secondaryBackground,
            borderColor: theme.border,
          }}
        >
          <span>Ordering round</span>
          <strong>{gameState.orderingRound}</strong>
        </div>

        <div style={styles.orderingPlayerList}>
          {gameState.players.map((player) => {
            const eligible = gameState.orderRollEligiblePlayerIds.includes(
              player.id,
            );
            const isActiveRoller = player.id === activeRollerId;
            const completed = gameState.orderRollCompletedPlayerIds.includes(
              player.id,
            );
            const latestRoll = player.orderRolls.at(-1);

            return (
              <div
                key={player.id}
                style={{
                  ...styles.orderingPlayerRow,
                  background: theme.secondaryBackground,
                  borderColor: isActiveRoller ? MEGA_ACCENT : theme.border,
                }}
              >
                <div style={styles.playerIdentity}>
                  <span
                    style={{
                      ...styles.playerToken,
                      background: "transparent",
                      color: player.colour,
                    }}
                  >
                    <MegaTokenGlyph tokenId={player.tokenId} fallback={player.name.charAt(0).toUpperCase()} />
                  </span>
                  <div>
                    <strong>{player.name}</strong>
                    <div
                      style={{
                        ...styles.playerPosition,
                        color: theme.mutedText,
                      }}
                    >
                      {player.orderRolls.length > 0
                        ? `Rolls: ${player.orderRolls.join(", ")}`
                        : "Not rolled yet"}
                    </div>
                  </div>
                </div>

                <OrderRollDice
                  total={latestRoll}
                  rollCount={player.orderRolls.length}
                  forceRolling={player.id === currentGamePlayer?.id && localRollAnimating}
                />

                <span
                  style={{
                    ...styles.orderingStatusBadge,
                    background: completed
                      ? "#147d3f"
                      : isActiveRoller
                        ? MEGA_ACCENT
                        : theme.border,
                    color: "#ffffff",
                  }}
                >
                  {completed
                    ? `Rolled ${latestRoll ?? ""}`
                    : isActiveRoller
                      ? "Roll now"
                      : eligible
                        ? "Waiting turn"
                        : "Waiting"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={requestOrderRoll}
          disabled={!isEligible || hasRolled || localRollAnimating}
          style={{
            ...styles.primaryButton,
            background: MEGA_ACCENT,
            color: "#ffffff",
            width: "100%",
            marginTop: "20px",
            opacity: !isEligible || hasRolled || localRollAnimating ? 0.55 : 1,
            cursor: !isEligible || hasRolled || localRollAnimating ? "not-allowed" : "pointer",
          }}
        >
          {localRollAnimating
            ? "Rolling…"
            : hasRolled
              ? "Roll submitted"
              : isEligible
                ? "Roll for Turn Order"
              : activeRoller
                ? `Waiting for ${activeRoller.name}`
                : "Waiting"}
        </button>

        <p style={{ ...styles.orderingWaitingText, color: theme.mutedText }}>
          {activeRoller
            ? `${activeRoller.name} rolls next. Turn-order rolls happen one player at a time.`
            : waitingForPlayers.length > 0
              ? `Waiting for: ${waitingForPlayers.map((player) => player.name).join(", ")}`
              : "Calculating the turn order..."}
        </p>

        {message && (
          <p
            role="status"
            aria-live="polite"
            style={{
              ...styles.message,
              background: theme.secondaryBackground,
              borderColor: theme.border,
            }}
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
