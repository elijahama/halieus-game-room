import React from "react";
import { createRoot } from "react-dom/client";
import { AccountPanel } from "../../client/src/platform/accounts/AccountPanel";
const account = {
  id: "qa-owner", role: "owner", status: "active", username: "owner",
  displayName: "Owner Player", avatar: "OP", profilePicture: null,
  playerColor: "#2563eb", createdAt: 1793270000000, lastLoginAt: 1793270000000,
};
function Fixture() {
  const [closed,setClosed]=React.useState(false);
  return closed ? <output>Account closed</output> :
    <AccountPanel account={account as any} onClose={()=>setClosed(true)}
      onLogout={()=>setClosed(true)} onAccountChange={()=>{}}
      betaMode={false} onEnterBetaMode={()=>{}} onExitBetaMode={()=>{}} />;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
