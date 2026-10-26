import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ActiveMatchNotice } from "../../client/src/platform/components/ActiveMatchNotice";
import { ConfirmDialog } from "../../client/src/platform/components/ConfirmDialog";
import { useMegaTakeoverConfirmation } from "../../client/src/platform/components/useMegaTakeoverConfirmation";
function Fixture() {
  const [account, setAccount] = useState("owner");
  const [returned, setReturned] = useState("");
  const [recovered, setRecovered] = useState<string[]>([]);
  const [target, setTarget] = useState({ code: "ORIGINAL", playerName: "Original player", reconnectToken: "original-key" });
  const takeover = useMegaTakeoverConfirmation(account || undefined, session => setRecovered(items => [...items, JSON.stringify(session)]));
  return <><button onClick={() => setAccount("")}>Logout</button><button onClick={() => setAccount("other")}>Switch account</button>
    <input aria-label="Focus target" />
    <button onClick={() => takeover.request(target)}>Manual takeover</button>
    <button onClick={() => setTarget({ code: "CHANGED", playerName: "Changed player", reconnectToken: "changed-key" })}>Change target</button>
    <ConfirmDialog open={Boolean(takeover.target)} title="Take over Mega Board session?" message={`Take over ${takeover.target?.session.code}? Another browser will be disconnected.`}
      confirmLabel="Take Over Session" onCancel={takeover.cancel} onConfirm={takeover.confirm} />
    <div data-testid="takeover-results">{JSON.stringify(recovered)}</div>
    {account && <ActiveMatchNotice key={account} accountId={account} onReturn={async match => {
      setReturned(match.matchId); return "That player session is already active. Choose Take Over Session to continue here.";
    }} />}
    <output>{returned}</output></>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
