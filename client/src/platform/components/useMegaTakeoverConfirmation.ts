import { useEffect, useRef, useState } from "react";

interface RecoveryTarget { code: string; playerName: string; reconnectToken: string }
interface PendingTakeover { session: RecoveryTarget; accountId: string | undefined }

/** A one-use confirmation bound to the validated target and account (including guests). */
export function useMegaTakeoverConfirmation(accountId: string | undefined, recover: (session: RecoveryTarget) => void) {
  const pending = useRef<PendingTakeover | null>(null);
  const [target, setTarget] = useState<PendingTakeover | null>(null);
  function cancel() { pending.current = null; setTarget(null); }
  useEffect(() => { cancel(); }, [accountId]);
  function request(session: RecoveryTarget) {
    const snapshot = { session: { ...session }, accountId };
    pending.current = snapshot;
    setTarget(snapshot);
  }
  function confirm() {
    const snapshot = pending.current;
    cancel();
    if (snapshot && snapshot.accountId === accountId) recover(snapshot.session);
  }
  return { target: target?.accountId === accountId ? target : null, request, cancel, confirm };
}
