import {
  BOARD_SPACES,
  getPropertyGroupColour,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import type { GameState } from "../../../../../shared/games/mega-board/game-state";

interface Props {
  gameState: GameState;
  onClose: () => void;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
}

export function AvailablePropertiesModal({ gameState, onClose, theme }: Props) {
  const spaces = BOARD_SPACES.filter(isOwnableBoardSpace).filter(
    (space) => !gameState.propertyOwners[space.id],
  );

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="available-properties-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-inventory-title"
        onMouseDown={(event) => event.stopPropagation()}
        style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text }}
      >
        <div className="available-properties-heading">
          <div>
            <p className="modal-eyebrow">Mega Board Bank</p>
            <h2 id="bank-inventory-title">Bank</h2>
            <p style={{ color: theme.mutedText }}>
              {spaces.length} unowned asset{spaces.length === 1 ? "" : "s"} remain.
            </p>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose}>×</button>
        </div>

        <div className="bank-building-stock" style={{ background: theme.secondaryBackground, borderColor: theme.border }}>
          {([
            ["🏠", "Houses", gameState.bankInventory.houses],
            ["🏨", "Hotels", gameState.bankInventory.hotels],
            ["🏙️", "Skyscrapers", gameState.bankInventory.skyscrapers],
            ["🚉", "Depots", gameState.bankInventory.depots],
          ] as const).map(([icon, label, count]) => (
            <div key={label} className={`bank-building-stock-item ${count === 0 ? "is-empty" : ""}`}>
              <span>{icon} {label}</span>
              <strong>{count}</strong>
              <em>{count === 0 ? "Out of stock" : "Available"}</em>
            </div>
          ))}
        </div>

        <div className="bank-assets-heading">
          <strong>Available assets</strong>
          <span style={{ color: theme.mutedText }}>{spaces.length} remaining</span>
        </div>

        <div className="available-properties-grid">
          {spaces.length === 0 ? (
            <p style={{ color: theme.mutedText }}>Every purchasable asset is owned.</p>
          ) : spaces.map((space) => {
            const colour = isPropertyBoardSpace(space)
              ? getPropertyGroupColour(space.group)
              : space.type === "railroad"
                ? "#111827"
                : "#0ea5e9";
            return (
              <article
                key={space.id}
                className="available-property-card"
                style={{ background: theme.secondaryBackground, borderColor: theme.border }}
              >
                <i style={{ background: colour }} />
                <div>
                  <strong>{space.name}</strong>
                  <small style={{ color: theme.mutedText }}>
                    {space.type === "railroad" ? "Station" : space.type === "utility" ? "Utility" : "Property"}
                  </small>
                </div>
                <span>£{space.price.toLocaleString()}</span>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
