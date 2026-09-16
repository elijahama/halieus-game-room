import type { BoardSpace } from "../../../../../shared/games/mega-board/board";
import { styles } from "../styles/gameStyles";

interface PurchasePanelProps {
  space: BoardSpace;
  isMine: boolean;
  canAfford: boolean;
  isResolving: boolean;
  theme: {
    cardBackground: string;
    mutedText: string;
    border: string;
    text: string;
  };
  onBuy: () => void;
  onPass: () => void;
}

export function PurchasePanel({
  space,
  isMine,
  canAfford,
  isResolving,
  theme,
  onBuy,
  onPass,
}: PurchasePanelProps) {
  const price = "price" in space ? space.price : null;

  return (
    <section
      className="purchase-reveal-panel"
      style={{
        ...styles.purchasePanel,
        background: theme.cardBackground,
        borderColor: isMine ? "#e6b94f" : theme.border,
      }}
    >
      <span style={styles.purchaseEyebrow}>Property decision</span>
      <strong style={styles.purchaseTitle}>{space.name}</strong>
      {price !== null && (
        <span style={styles.purchasePrice}>£{price.toLocaleString()}</span>
      )}

      {isMine ? (
        <>
          <p style={{ ...styles.purchaseText, color: theme.mutedText }}>
            Buy this space now, or pass it into an auction for every active player.
          </p>
          <div style={styles.purchaseActions}>
            <button
              type="button"
              onClick={onBuy}
              disabled={isResolving || !canAfford}
              style={{
                ...styles.buyButton,
                opacity: isResolving || !canAfford ? 0.55 : 1,
                cursor:
                  isResolving || !canAfford ? "not-allowed" : "pointer",
              }}
            >
              {isResolving
                ? "Working..."
                : canAfford
                  ? "Buy"
                  : "Cannot afford"}
            </button>
            <button
              type="button"
              onClick={onPass}
              disabled={isResolving}
              style={{
                ...styles.passButton,
                borderColor: theme.border,
                color: theme.text,
                opacity: isResolving ? 0.55 : 1,
              }}
            >
              Pass to Auction
            </button>
          </div>
        </>
      ) : (
        <p style={{ ...styles.purchaseText, color: theme.mutedText }}>
          Waiting for the current player to choose.
        </p>
      )}
    </section>
  );
}
