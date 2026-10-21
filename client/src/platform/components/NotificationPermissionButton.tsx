import { useEffect, useState } from "react";
import { accountApi } from "../accounts/api";

function decodeApplicationKey(key: string): Uint8Array<ArrayBuffer> {
  const normalized = key.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(normalized.padEnd(Math.ceil(normalized.length/4)*4, "="));
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  for (let i=0;i<bytes.length;i++) view[i]=bytes.charCodeAt(i);
  return view;
}

function isPushServiceFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /registration failed\s*[-–]\s*(?:push service (?:error|not available)|could not connect to push server)/i.test(message);
}

/** Only a direct user click may request browser/PWA notification permission. */
export function NotificationPermissionButton({ accountId }: {accountId?: string | null}) {
  const supported = typeof Notification !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pushServiceFailure, setPushServiceFailure] = useState(false);

  useEffect(() => {
    let active=true;
    setEnabled(false); setError(""); setPushServiceFailure(false);
    if (!supported || !accountId) return;
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      const existing=await registration?.pushManager.getSubscription();
      const saved=existing
        ? await accountApi<{ok:true;enabled:boolean}>("/accounts/push/status",{
          method:"POST",body:JSON.stringify({endpoint:existing.endpoint}),
        }).catch(()=>null)
        : null;
      if (active) {setEnabled(Boolean(existing && saved?.enabled));setPermission(Notification.permission);}
    }).catch(() => undefined);
    return () => {active=false;};
  }, [accountId, supported]);

  if (!supported || !accountId) return null;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);setError("");setPushServiceFailure(false);
    try {
      const registration=await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("Install or reload HGR to activate its notification service.");
      const existing=await registration.pushManager.getSubscription();
      if (enabled) {
        if (existing) {
          await accountApi("/accounts/push/unsubscribe",{
            method:"POST",body:JSON.stringify({endpoint:existing.endpoint}),
          });
          await existing.unsubscribe();
        }
        setEnabled(false);
        setPermission(Notification.permission);
        return;
      }
      const result=Notification.permission==="granted"
        ? "granted" : await Notification.requestPermission();
      setPermission(result);
      if (result!=="granted") throw new Error("Enable notifications in your browser or phone settings first.");
      const config=await accountApi<{ok:true;available:boolean;publicKey:string|null}>("/accounts/push/config");
      if (!config.available || !config.publicKey) throw new Error("HGR background notifications are not yet available.");
      const sub=existing ?? await registration.pushManager.subscribe({
        userVisibleOnly:true,applicationServerKey:decodeApplicationKey(config.publicKey),
      });
      try {
        await accountApi("/accounts/push/subscribe",{
          method:"POST",body:JSON.stringify({subscription:sub.toJSON(),topics:["invites","messages"]}),
        });
      } catch (error) {
        // Only revoke a fresh browser subscription. A device previously
        // enrolled by another signed-in user can safely be rebound later.
        if (!existing) await sub.unsubscribe().catch(()=>undefined);
        throw error;
      }
      setEnabled(true);
    } catch (caught) {
      if (isPushServiceFailure(caught)) {
        setPushServiceFailure(true);
        setError("This browser could not register with its push service. PWA alerts are not enabled on this device.");
      } else {
        setError(caught instanceof Error ? caught.message : "Could not update notification settings.");
      }
    } finally {setBusy(false);}
  };
  return <div className="hgr-notification-enrollment">
    <button type="button" className="halieus-install-app" disabled={busy || permission==="denied"} onClick={() => void toggle()}>
      <span aria-hidden="true">◌</span>
      <b>{busy ? "Updating alerts…" : permission==="denied" ? "Notifications blocked"
        : enabled ? "Disable PWA alerts" : "Enable PWA alerts"}</b>
    </button>
    {error && <div role="alert" className="hgr-push-registration-help" style={{maxWidth:"100%",overflowWrap:"anywhere",marginTop:8,lineHeight:1.45}}>
      <small>{error}</small>
      {pushServiceFailure && <small style={{display:"block",marginTop:6}}>
        On Brave desktop, open <strong>brave://settings/privacy</strong> and, if you choose,
        enable <strong>Use Google services for push messaging</strong>. Restart Brave and retry.
        On phones or other browsers, check connectivity and browser/OS notification settings;
        if that fails, try a different supported browser. Your HGR Inbox and in-app alerts
        still work while HGR is open.
      </small>}
    </div>}
  </div>;
}
