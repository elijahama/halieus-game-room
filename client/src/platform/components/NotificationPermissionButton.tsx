import { useEffect, useRef, useState } from "react";
import { accountApi } from "../accounts/api";

type PushControlMode = "enroll" | "settings";
type PushChange = { accountId: string; enabled: boolean };
const PUSH_CHANGE_EVENT = "hgr-push-enrollment-changed";
const PUSH_TIMEOUT_MS = 10_000;

function decodeApplicationKey(key: string): Uint8Array<ArrayBuffer> {
  const normalized = key.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) view[i] = bytes.charCodeAt(i);
  return view;
}

function isPushServiceFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /registration failed\s*[-–—:]\s*(?:push service (?:error|not available)|could not connect to push server)/i.test(message);
}

async function bounded<T>(operation: Promise<T>, label: string, timeoutMs = PUSH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out. Check your connection and try again.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function pushApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  try {
    return await bounded(accountApi<T>(path, { ...init, signal: controller.signal }), "HGR notification request");
  } catch (error) {
    controller.abort();
    throw error;
  }
}

/** The banner offers enrolment only. Subscribed users manage alerts from their profile. */
export function NotificationPermissionButton({
  accountId,
  mode = "enroll",
}: {
  accountId?: string | null;
  mode?: PushControlMode;
}) {
  const supported = typeof Notification !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied");
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pushServiceFailure, setPushServiceFailure] = useState(false);
  const currentAccount = useRef(accountId);
  const generation = useRef(0);
  currentAccount.current = accountId;

  useEffect(() => {
    const thisGeneration = ++generation.current;
    let live = true;
    const valid = () => live && generation.current === thisGeneration && currentAccount.current === accountId;
    setEnabled(false);
    setChecking(true);
    setBusy(false);
    setError("");
    setPushServiceFailure(false);
    if (!supported || !accountId) {
      setChecking(false);
      return () => { live = false; generation.current++; };
    }
    const refresh = async () => {
      try {
        const registration = await bounded(navigator.serviceWorker.getRegistration(), "Notification service check");
        const existing = await bounded(registration?.pushManager.getSubscription() ?? Promise.resolve(null),
          "Notification subscription check");
        const saved = existing
          ? await pushApi<{ ok: true; enabled: boolean }>("/accounts/push/status", {
            method: "POST", body: JSON.stringify({ endpoint: existing.endpoint }),
          })
          : null;
        if (valid()) {
          setEnabled(Boolean(existing && saved?.enabled));
          setPermission(Notification.permission);
          setError("");
        }
      } catch {
        if (valid()) setError("Could not confirm this device's PWA alerts. You can retry from this device.");
      } finally {
        if (valid()) setChecking(false);
      }
    };
    const onChange = (event: Event) => {
      const change = (event as CustomEvent<PushChange>).detail;
      if (change?.accountId !== accountId || !valid()) return;
      // Show the successful state immediately, then reconcile with the server.
      setEnabled(change.enabled);
      setError("");
      void refresh();
    };
    window.addEventListener(PUSH_CHANGE_EVENT, onChange);
    void refresh();
    return () => {
      live = false;
      generation.current++;
      window.removeEventListener(PUSH_CHANGE_EVENT, onChange);
    };
  }, [accountId, supported]);

  if (!accountId) return null;
  if (!supported) return mode === "settings"
    ? <div className="account-settings-card hgr-push-settings"><p>Background PWA alerts are unavailable in this browser. Your HGR Inbox still works when HGR is open.</p></div>
    : null;

  // Do not show the full-width enrolment ribbon during account verification or
  // after a verified subscription. The settings control remains discoverable.
  if (mode === "enroll" && (checking || enabled)) return null;
  const toggle = async () => {
    if (busy || checking) return;
    const requestedAccount = accountId;
    const run = generation.current;
    const valid = () => currentAccount.current === requestedAccount && generation.current === run;
    setBusy(true);
    setError("");
    setPushServiceFailure(false);
    try {
      const registration = await bounded(navigator.serviceWorker.getRegistration(), "Notification service check");
      if (!registration) throw new Error("Install or reload HGR to activate its notification service.");
      const existing = await bounded(registration.pushManager.getSubscription(), "Notification subscription check");
      if (!valid()) return;
      if (enabled) {
        if (existing) {
          await pushApi("/accounts/push/unsubscribe", {
            method: "POST", body: JSON.stringify({ endpoint: existing.endpoint }),
          });
          if (!valid()) return;
          await bounded(existing.unsubscribe(), "Notification browser unsubscribe");
        }
        if (!valid()) return;
        setEnabled(false);
        setPermission(Notification.permission);
        window.dispatchEvent(new CustomEvent<PushChange>(PUSH_CHANGE_EVENT, {
          detail: { accountId: requestedAccount, enabled: false },
        }));
        return;
      }
      const result = Notification.permission === "granted"
        ? "granted" : await bounded(Notification.requestPermission(), "Notification permission request");
      if (!valid()) return;
      setPermission(result);
      if (result !== "granted") throw new Error("Enable notifications in your browser or phone settings first.");
      const config = await pushApi<{ ok: true; available: boolean; publicKey: string | null }>("/accounts/push/config");
      if (!valid()) return;
      if (!config.available || !config.publicKey) throw new Error("HGR background notifications are not yet available.");
      const sub = existing ?? await bounded(registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: decodeApplicationKey(config.publicKey),
      }), "Notification push registration");
      if (!valid()) return;
      try {
        await pushApi("/accounts/push/subscribe", {
          method: "POST", body: JSON.stringify({ subscription: sub.toJSON(), topics: ["invites", "messages"] }),
        });
      } catch (error) {
        // Revoke only subscriptions created by this attempt, not another user's.
        if (!existing) await bounded(sub.unsubscribe(), "Notification rollback").catch(() => undefined);
        throw error;
      }
      if (!valid()) return;
      setEnabled(true);
      window.dispatchEvent(new CustomEvent<PushChange>(PUSH_CHANGE_EVENT, {
        detail: { accountId: requestedAccount, enabled: true },
      }));
    } catch (caught) {
      if (!valid()) return;
      if (isPushServiceFailure(caught)) {
        setPushServiceFailure(true);
        setError("This browser could not register with its push service. PWA alerts are not enabled on this device.");
      } else {
        setError(caught instanceof Error ? caught.message : "Could not update notification settings.");
      }
    } finally {
      if (valid()) setBusy(false);
    }
  };

  return <div className={mode === "settings" ? "hgr-push-settings" : "hgr-notification-enrollment"}>
    {mode === "settings" && <div>
      <strong>Background PWA alerts</strong>
      <p role="status">{checking ? "Checking this device…" : enabled
        ? "Enabled on this device." : "Not enabled on this device."}</p>
    </div>}
    <button type="button" className={mode === "settings" ? "button-outline" : "halieus-install-app"}
      disabled={checking || busy || (permission === "denied" && !enabled)}
      onClick={() => void toggle()}>
      {mode !== "settings" && <span aria-hidden="true">🔔</span>}
      <b>{busy ? "Updating alerts…" : checking ? "Checking alerts…" : enabled
        ? "Disable PWA alerts" : permission === "denied" ? "Notifications blocked" : "Enable PWA alerts"}</b>
    </button>
    {error && <div role="alert" className="hgr-push-registration-help"
      style={{ maxWidth: "100%", overflowWrap: "anywhere", marginTop: 8, lineHeight: 1.45 }}>
      <small>{error}</small>
      {pushServiceFailure && <small style={{ display: "block", marginTop: 6 }}>
        On Brave desktop, open <strong>brave://settings/privacy</strong> and, if you choose,
        enable <strong>Use Google services for push messaging</strong>. Restart Brave and retry.
        On phones or other browsers, check connectivity and browser/OS notification settings;
        if that fails, try a different supported browser. Your HGR Inbox and in-app alerts
        still work while HGR is open.
      </small>}
    </div>}
  </div>;
}
