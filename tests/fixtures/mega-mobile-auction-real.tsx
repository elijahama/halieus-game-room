import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { AuctionPanel } from "../../client/src/games/mega-board/components/AuctionPanel";

declare global {
  interface Window {
    hgrAuctionActions?: { bid: number | null; withdrew: boolean };
  }
}

const players = Array.from({ length: 8 }, (_, i) => ({
  id: `seat-${i + 1}`,
  name: ["Rook", "Milo", "Atlas", "Lagz", "Nova", "Sage", "Echo", "Pixel"][i],
  colour: ["#ae8b2c", "#fcda00", "#003ef9", "#ed2042", "#08793a", "#169da0", "#820076", "#eaa9b9"][i],
  cash: 2500,
  isBankrupt: false,
}));
const state = {
  players,
  pendingAuction: {
    id: "test-mobile-auction",
    spaceId: 7,
    currentBid: 150,
    minimumIncrement: 10,
    highestBidderId: "seat-3",
    activeBidderIds: players.map(p => p.id),
    bidsByPlayerId: { "seat-3": 150, "seat-1": 100 },
    endsAt: Date.now() + 90000,
  },
};
const theme = {
  cardBackground: "#081723",
  secondaryBackground: "#102235",
  text: "#f9fafb",
  mutedText: "#b4c1cd",
  border: "#435e78",
};
function TestAuction() {
  return createPortal(
    <div className="mega-mobile-auction-layer" role="dialog" aria-modal="true" aria-label="Mega Board auction">
      <div className="mega-mobile-auction-sheet">
        <AuctionPanel
          playerId="seat-4"
          gameState={state as any}
          isResolving={false}
          theme={theme}
          onBid={(value) => { if (window.hgrAuctionActions) window.hgrAuctionActions.bid = value; }}
          onWithdraw={() => { if (window.hgrAuctionActions) window.hgrAuctionActions.withdrew = true; }}
        />
      </div>
    </div>,
    document.body,
  );
}
window.hgrAuctionActions = { bid: null, withdrew: false };
createRoot(document.getElementById("hgr-root")!).render(<TestAuction />);
