import React from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { AuctionPanel } from "../../client/src/games/mega-board/components/AuctionPanel";

declare global {
  interface Window {
    hgrAuctionActions?: { bid: number | null; withdrew: boolean };
  }
}

const params = new URLSearchParams(location.search);
const role = params.get("role") || "active";
const players = Array.from({ length: Number(params.get("players") || 8) }, (_, i) => ({
  id: `seat-${i + 1}`,
  name: params.has("long") ? `Alexandria Longpropertyname Seat ${i+1}` : ["Rook", "Milo", "Atlas", "Lagz", "Nova", "Sage", "Echo", "Pixel"][i],
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
    activeBidderIds: players.filter(p => role !== "withdrawn" || p.id !== "seat-4").map(p => p.id),
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
          playerId={role === "spectator" ? "observer" : "seat-4"}
          isSpectator={role === "spectator"}
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
