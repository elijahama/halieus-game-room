import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminFeedbackNotice } from "../../client/src/platform/components/AdminFeedbackNotice";
import { AccountPanel } from "../../client/src/platform/accounts/AccountPanel";
function Fixture() {
  const [focus, setFocus] = useState<string | null>(null);
  const account = {id:"owner",role:"owner",username:"owner",displayName:"Owner",avatar:"OW",playerColor:"#3478ab",profilePicture:null} as any;
  return <><AdminFeedbackNotice accountId="owner" onOpen={setFocus} />
    {focus && <AccountPanel account={account} feedbackFocusId={focus} betaMode={false}
      onClose={()=>setFocus(null)} onAccountChange={()=>{}} onLogout={()=>{}}
      onEnterBetaMode={()=>{}} onExitBetaMode={()=>{}} />}</>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
