import {
  BOARD_SPACES,
} from "../../../../../shared/games/mega-board/board";

import type {
  PendingSpeedDieAction,
} from "../../../../../shared/games/mega-board/game-state";

import {
  useMemo,
  useState,
} from "react";

import {
  styles,
} from "../styles/gameStyles";

interface SpeedDiePanelProps {
  action: PendingSpeedDieAction;
  playerName: string;
  isMine: boolean;
  isResolving: boolean;
  currentPosition: number;
  theme: {
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onTripleMove: (
    position: number,
  ) => void;
  onBusMove: (spaces: number) => void;
  onMrMonopoly: () => void;
}

export function SpeedDiePanel({
  action,
  playerName,
  isMine,
  isResolving,
  currentPosition,
  theme,
  onTripleMove,
  onBusMove,
  onMrMonopoly,
}: SpeedDiePanelProps) {
  const availableDestinations =
    useMemo(
      () =>
        BOARD_SPACES.filter(
          (space) =>
            space.position !==
            currentPosition,
        ),
      [currentPosition],
    );

  const [selectedPosition, setSelectedPosition] =
    useState(
      availableDestinations[0]
        ?.position ?? 0,
    );

  return (
    <section
      className="speed-die-panel"
      style={{
        ...styles.speedDiePanel,
        background:
          theme.secondaryBackground,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      <div style={styles.speedDieHeader}>
        <div>
          <span
            style={styles.speedDieEyebrow}
          >
            Speed Die
          </span>
          <h3 style={styles.speedDieTitle}>
            {action.type === "triple"
              ? `Triple ${action.tripleValue}s`
              : action.type === "bus"
                ? "Bus result"
                : "Mr. Monopoly"}
          </h3>
        </div>

        <span
          aria-hidden="true"
          style={styles.speedDieIcon}
        >
          {action.type === "triple"
            ? "🎲"
            : action.type === "bus"
              ? "🚌"
              : "🎩"}
        </span>
      </div>

      {action.type === "triple" && (
        <>
          <p
            style={{
              ...styles.speedDieDescription,
              color: theme.mutedText,
            }}
          >
            Choose any other space on the board. This ends the dice sequence, so doubles do not grant another roll.
          </p>

          {isMine ? (
            <div
              style={styles.speedDieChoiceGrid}
            >
              <label
                style={styles.speedDieLabel}
              >
                Destination
                <select
                  value={selectedPosition}
                  disabled={isResolving}
                  onChange={(event) =>
                    setSelectedPosition(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  style={{
                    ...styles.speedDieSelect,
                    background:
                      theme.secondaryBackground,
                    color: theme.text,
                    borderColor:
                      theme.border,
                  }}
                >
                  {availableDestinations.map(
                    (space) => (
                      <option
                        key={space.id}
                        value={
                          space.position
                        }
                      >
                        {space.position}. {space.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <button
                type="button"
                disabled={isResolving}
                onClick={() =>
                  onTripleMove(
                    selectedPosition,
                  )
                }
                style={{
                  ...styles.speedDiePrimaryButton,
                  opacity: isResolving
                    ? 0.55
                    : 1,
                }}
              >
                Move Token
              </button>
            </div>
          ) : (
            <p
              style={{
                ...styles.speedDieWaitingText,
                color: theme.mutedText,
              }}
            >
              Waiting for {playerName} to choose a destination.
            </p>
          )}
        </>
      )}

      {action.type === "bus" && (
        <>
          <div className="speed-die-stat-chips" style={styles.speedDieStats}>
            <span>🎲 {action.white1} + {action.white2}</span>
          </div>

          {isMine ? (
            <div className="bus-result-choice-grid">
              <div className="bus-move-choice-row" aria-label="Bus movement choices">
                {[action.white1, action.white2, action.whiteDiceTotal]
                  .filter((value, index, values) => values.indexOf(value) === index)
                  .map((spaces) => (
                    <button
                      key={spaces}
                      type="button"
                      disabled={isResolving}
                      onClick={() => onBusMove(spaces)}
                      className="bus-move-choice"
                    >
                      Move {spaces}
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <p
              style={{
                ...styles.speedDieWaitingText,
                color: theme.mutedText,
              }}
            >
              Waiting for {playerName} to choose a movement value.
            </p>
          )}
        </>
      )}

      {action.type ===
        "mr-monopoly" && (
        <>
          <p
            style={{
              ...styles.speedDieDescription,
              color: theme.mutedText,
            }}
          >
            Move forward to the next unowned asset. When every asset is owned, move to the next unmortgaged asset where rent is owed.
          </p>

          {isMine ? (
            <button
              type="button"
              disabled={isResolving}
              onClick={onMrMonopoly}
              style={{
                ...styles.speedDiePrimaryButton,
                opacity: isResolving
                  ? 0.55
                  : 1,
              }}
            >
              Take Bonus Move
            </button>
          ) : (
            <p
              style={{
                ...styles.speedDieWaitingText,
                color: theme.mutedText,
              }}
            >
              Waiting for {playerName} to complete the bonus move.
            </p>
          )}
        </>
      )}
    </section>
  );
}
