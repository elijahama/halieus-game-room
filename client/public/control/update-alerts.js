(() => {
  "use strict";
  // Explicit consent. The Control PWA's own scoped service worker receives
  // server-sent update stages even if Android suspends the Control page.
  const button = document.getElementById("controlUpdateAlerts");
  const status = document.getElementById("controlUpdateAlertsStatus");
  const test = document.getElementById("controlUpdateAlertsTest");
  if (!button || !status || !test) return;
  const supported = typeof Notification !== "undefined"
    && "serviceWorker" in navigator && "PushManager" in window;
  let busy = false;
  let enabled = false;
  let subscription = null;
  let registration = null;

  async function api(path, body) {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include", cache: "no-store",
      headers: body === undefined ? { Accept: "application/json" } :
        { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.reason || "Control notification service unavailable.");
    return result;
  }
  function keyBytes(key) {
    const bytes = atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "="));
    return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
  }
  function show(message) {
    status.textContent = message;
    button.textContent = busy ? "Working…" : enabled ? "Disable update alerts" : "Enable update alerts";
    button.disabled = busy || !supported;
    test.hidden = !enabled;
    test.disabled = busy;
  }
  async function currentRegistration() {
    if (registration) return registration;
    registration = await navigator.serviceWorker.getRegistration("/control/");
    if (!registration) {
      registration = await navigator.serviceWorker.register("/control/sw.js?v=control-update-alerts-1",
        { scope: "/control/", updateViaCache: "none" });
    }
    return registration;
  }
  async function refresh() {
    if (!supported) {
      show("Background alerts are unavailable in this browser. Update status remains in Control.");
      return;
    }
    try {
      const service = await currentRegistration();
      subscription = await service.pushManager.getSubscription();
      const state = subscription
        ? await api("/accounts/push/status", { endpoint: subscription.endpoint })
        : { enabled: false, topics: [] };
      enabled = Boolean(state.enabled && state.topics?.includes("operations"));
      show(enabled
        ? "Enabled for this device. Android may group milestone alerts; tap one to return to Control."
        : Notification.permission === "denied"
          ? "Notifications are blocked in your browser or Android settings."
          : "Get verified stage, quarter-progress and final Update alerts outside the app.");
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not check update notifications.");
    }
  }
  button.addEventListener("click", async () => {
    if (!supported || busy) return;
    busy = true; show("Checking notifications…");
    try {
      // The permission prompt must be triggered directly by this click.
      // Waiting on service-worker setup first can lose user activation.
      const permission = enabled ? "granted" : Notification.permission === "granted"
        ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Enable notifications in browser and phone settings first.");
      const service = await currentRegistration();
      subscription = await service.pushManager.getSubscription();
      if (enabled) {
        // This Control registration is scoped only to Control and not the
        // separate Game Room PWA's invitation/message subscription.
        if (subscription) {
          await api("/accounts/push/unsubscribe", { endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
        subscription = null;
        enabled = false;
        show("Control update alerts disabled on this device.");
      } else {
        const config = await api("/accounts/push/config");
        if (!config.available || !config.publicKey) throw new Error("HGR notification service is unavailable.");
        const created = !subscription;
        subscription ||= await service.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey),
        });
        try {
          const payload = subscription.toJSON();
          await api("/accounts/push/subscribe", {
            subscription: { endpoint: subscription.endpoint, keys: payload.keys }, topics: ["operations"],
          });
        } catch (error) {
          if (created) {
            await subscription.unsubscribe().catch(() => {});
            subscription = null;
          }
          throw error;
        }
        enabled = true;
        show("Update alerts enabled for this device. You can switch apps while HGR updates.");
      }
    } catch (error) {
      show(error instanceof Error ? error.message : "Could not change Control update alerts.");
    } finally { busy = false; show(status.textContent); }
  });
  test.addEventListener("click", async () => {
    if (!enabled || busy || !subscription) return;
    busy = true; show("Sending test…");
    try {
      const result = await api("/accounts/push/test", { endpoint: subscription.endpoint });
      show(result.message || "Test sent to your browser push service.");
    } catch (error) {
      show(error instanceof Error ? error.message : "Test notification could not be delivered.");
    } finally { busy = false; show(status.textContent); }
  });
  void refresh();
  window.addEventListener("pageshow", () => { if (!busy) void refresh(); });
})();