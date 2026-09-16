import {
  JAIL_FINE,
} from "../../../../../shared/games/mega-board/game-rules";

import type {
  GamePlayer,
} from "../../../../../shared/games/mega-board/game-state";

import {
  styles,
} from "../styles/gameStyles";

interface JailPanelProps {
  player: GamePlayer;
  isMine: boolean;
  isResolving: boolean;
  canSeePrivateInfo?: boolean;
  theme: {
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onRoll: () => void;
  onPayFine: () => void;
  onUseCard: () => void;
}

export function JailPanel({
  player,
  isMine,
  isResolving,
  canSeePrivateInfo = false,
  theme,
  onRoll,
  onPayFine,
  onUseCard,
}: JailPanelProps) {
  const attemptNumber =
    Math.min(3, player.jailTurns + 1);

  return (
    <section
      style={{
        ...styles.jailPanel,
        background:
          theme.secondaryBackground,
        borderColor: theme.border,
      }}
    >
      <div style={styles.jailHeader}>
        <div>
          <span style={styles.jailEyebrow}>
            Jail decision
          </span>
          <h3 style={styles.jailTitle}>
            {player.name} is in Jail
          </h3>
        </div>
        <span
          aria-hidden="true"
          style={styles.jailIcon}
        >
          🔒
        </span>
      </div>

      <div style={styles.jailSummary}>
        <strong>
          Attempt {attemptNumber} of 3
        </strong>
        <span
          style={{
            color: theme.mutedText,
          }}
        >
          Roll doubles, pay £{JAIL_FINE}, or use a held card.
        </span>
      </div>

      <div style={styles.jailStats}>
        <span>
          Cash: {isMine || canSeePrivateInfo ? `£${player.cash.toLocaleString()}` : "£••••"}
        </span>
        <span>
          Jail cards: {player.getOutOfJailCards}
        </span>
      </div>

      {isMine ? (
        <div style={styles.jailActions}>
          <button
            type="button"
            onClick={onRoll}
            disabled={isResolving}
            style={{
              ...styles.jailRollButton,
              opacity: isResolving
                ? 0.55
                : 1,
            }}
          >
            Roll for Doubles
          </button>

          <button
            type="button"
            onClick={onPayFine}
            disabled={isResolving}
            style={{
              ...styles.jailPayButton,
              opacity: isResolving
                ? 0.55
                : 1,
            }}
          >
            Pay £{JAIL_FINE}
          </button>

          <button
            type="button"
            onClick={onUseCard}
            disabled={
              isResolving ||
              player.getOutOfJailCards < 1
            }
            style={{
              ...styles.jailCardButton,
              opacity:
                isResolving ||
                player.getOutOfJailCards < 1
                  ? 0.55
                  : 1,
            }}
          >
            Use Jail Card
          </button>
        </div>
      ) : (
        <p
          style={{
            ...styles.jailWaitingText,
            color: theme.mutedText,
          }}
        >
          Waiting for {player.name} to choose a Jail action.
        </p>
      )}
    </section>
  );
}
