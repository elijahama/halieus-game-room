import type { GameState } from "../../../../../shared/games/mega-board/game-state";
import {
  getPropertyGroupColour,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  isUtilityBoardSpace,
  type OwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board";

interface PropertyDeedModalProps {
  space: OwnableBoardSpace;
  gameState: GameState;
  theme: {
    text: string;
    mutedText: string;
    border: string;
  };
  onClose: () => void;
}

function money(value: number): string {
  return `£${value.toLocaleString()}`;
}

export function PropertyDeedModal({
  space,
  gameState,
  theme,
  onClose,
}: PropertyDeedModalProps) {
  const ownerId = gameState.propertyOwners[space.id];
  const owner = ownerId
    ? gameState.players.find((player) => player.id === ownerId)
    : undefined;
  const mortgaged = Boolean(gameState.mortgagedProperties[space.id]);
  const development = gameState.propertyDevelopments[space.id] ?? 0;
  const depot = Boolean(gameState.railroadDepots[space.id]);

  const accent = isPropertyBoardSpace(space)
    ? getPropertyGroupColour(space.group)
    : isRailroadBoardSpace(space)
      ? "#343941"
      : "#74808c";

  return (
    <div
      className="property-deed-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="property-deed-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${space.name} property details`}
      >
        <button
          type="button"
          className="property-deed-close"
          onClick={onClose}
          aria-label="Close property card"
        >
          ×
        </button>

        <header
          className="property-deed-title-strip"
          style={{ background: accent }}
        >
          <span>
            {isPropertyBoardSpace(space)
              ? "TITLE DEED"
              : isRailroadBoardSpace(space)
                ? "STATION DEED"
                : "UTILITY DEED"}
          </span>
          <h2>{space.name}</h2>
        </header>

        <div className="property-deed-summary">
          <div>
            <span>Purchase price</span>
            <strong>{money(space.price)}</strong>
          </div>
          <div>
            <span>Mortgage value</span>
            <strong>{money(space.mortgage)}</strong>
          </div>
        </div>

        <div className="property-deed-status" style={{ borderColor: theme.border }}>
          <span>
            Owner: <strong>{owner?.name ?? "Bank / Available"}</strong>
          </span>
          <span className={mortgaged ? "is-mortgaged" : ""}>
            {mortgaged
              ? "MORTGAGED"
              : isPropertyBoardSpace(space) && development > 0
                ? development <= 4
                  ? `${development} house${development === 1 ? "" : "s"}`
                  : development === 5
                    ? "Hotel"
                    : "Skyscraper"
                : isRailroadBoardSpace(space) && depot
                  ? "Train Depot installed"
                  : "Active"}
          </span>
        </div>

        {isPropertyBoardSpace(space) && (
          <div className="property-deed-rent-table">
            <h3>Rent</h3>
            <div><span>Site only</span><strong>{money(space.rents[0])}</strong></div>
            <div><span>Complete colour group</span><strong>{money(space.rents[1])}</strong></div>
            <div><span>With 1 house</span><strong>{money(space.rents[2])}</strong></div>
            <div><span>With 2 houses</span><strong>{money(space.rents[3])}</strong></div>
            <div><span>With 3 houses</span><strong>{money(space.rents[4])}</strong></div>
            <div><span>With 4 houses</span><strong>{money(space.rents[5])}</strong></div>
            <div><span>With hotel</span><strong>{money(space.rents[6])}</strong></div>
            <div><span>With skyscraper</span><strong>{money(space.rents[7])}</strong></div>
            <p>Buildings cost <strong>{money(space.houseCost)}</strong> each.</p>
          </div>
        )}

        {isRailroadBoardSpace(space) && (
          <div className="property-deed-rent-table">
            <h3>Station rent</h3>
            <div><span>Own 1 station</span><strong>{money(space.rents[0])}</strong></div>
            <div><span>Own 2 stations</span><strong>{money(space.rents[1])}</strong></div>
            <div><span>Own 3 stations</span><strong>{money(space.rents[2])}</strong></div>
            <div><span>Own 4 stations</span><strong>{money(space.rents[3])}</strong></div>
            <p>Train Depot costs <strong>{money(space.depotCost)}</strong> and doubles this station's rent.</p>
          </div>
        )}

        {isUtilityBoardSpace(space) && (
          <div className="property-deed-rent-table">
            <h3>Utility rent</h3>
            <div><span>Own 1 utility</span><strong>{space.rentMultipliers[0]}× dice</strong></div>
            <div><span>Own 2 utilities</span><strong>{space.rentMultipliers[1]}× dice</strong></div>
            <div><span>Own 3 utilities</span><strong>{space.rentMultipliers[2]}× dice</strong></div>
          </div>
        )}

        <footer className="property-deed-footer">
          Click any ownable board space at any time to inspect its deed.
        </footer>
      </section>
    </div>
  );
}
