(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const pairPanel = byId("pairPanel"), dashboard = byId("dashboard"), pairForm = byId("pairForm");
  const pairInput = byId("pairCode"), pairButton = byId("pairButton"), pairMessage = byId("pairMessage");
  const actionMessage = byId("actionMessage"), connectionPill = byId("connectionPill");
  const restartButton = byId("restartButton"), refreshButton = byId("refreshButton"), logsButton = byId("logsButton");
  const forgetButton = byId("forgetButton"), installButton = byId("installButton"), logsList = byId("logsList");
  let deferredInstallPrompt = null;

  function setMessage(element, text, tone = "") {
    element.textContent = text || "";
    element.classList.toggle("is-error", tone === "error");
    element.classList.toggle("is-success", tone === "success");
  }
  function setConnection(state, label) {
    connectionPill.textContent = label;
    connectionPill.className = "status-pill " + (state === "online" ? "is-online" : state === "offline" ? "is-offline" : "is-checking");
  }
  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: "include", cache: "no-store", ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } });
    let body = null;
    try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) {
      const error = new Error(body && body.reason ? body.reason : `Request failed (${response.status}).`);
      error.status = response.status; error.body = body; throw error;
    }
    return body;
  }
  function showPairing(message = "") {
    pairPanel.hidden = false; dashboard.hidden = true; setConnection("offline", "Pair phone");
    if (message) setMessage(pairMessage, message, "error");
    window.setTimeout(() => pairInput.focus(), 50);
  }
  function showDashboard() { pairPanel.hidden = true; dashboard.hidden = false; setConnection("online", "Connected"); }
  function renderStatus(status) {
    byId("versionValue").textContent = status.hgrVersion || "—";
    byId("machineValue").textContent = status.machine && status.machine.name ? status.machine.name : "—";
    byId("branchValue").textContent = status.repository && status.repository.branch ? status.repository.branch : "—";
    byId("commitValue").textContent = status.repository && status.repository.commit ? status.repository.commit : "Commit unavailable";
    const dirty = status.repository ? status.repository.dirty : null;
    byId("repoStateValue").textContent = dirty === true ? "Changed" : dirty === false ? "Clean" : "Unknown";
    restartButton.disabled = Boolean(status.activeOperation);
    if (status.activeOperation) setMessage(actionMessage, `${status.activeOperation.action} is already running…`);
  }
  async function loadStatus({ quiet = false } = {}) {
    if (!quiet) setConnection("checking", "Checking");
    try {
      const status = await api("/api/status"); renderStatus(status); showDashboard(); return true;
    } catch (error) {
      if (error.status === 401) { showPairing(); return false; }
      setConnection("offline", "Offline");
      if (!quiet) setMessage(pairMessage, error.message || "Unable to reach HGR Control.", "error");
      return false;
    }
  }
  function formatTime(value) {
    try { return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); } catch { return ""; }
  }
  async function loadLogs() {
    logsButton.disabled = true;
    try {
      const result = await api("/api/logs");
      const entries = Array.isArray(result.entries) ? result.entries : [];
      logsList.textContent = "";
      if (entries.length === 0) {
        const empty = document.createElement("li"); empty.className = "empty-log"; empty.textContent = "No Control operations recorded yet."; logsList.append(empty); return;
      }
      for (const entry of entries.slice(0, 10)) {
        const row = document.createElement("li"); row.className = "is-" + entry.state;
        const dot = document.createElement("i"); dot.setAttribute("aria-hidden", "true");
        const copy = document.createElement("span"), title = document.createElement("strong"), detail = document.createElement("small"), time = document.createElement("time");
        title.textContent = `${entry.action} · ${entry.state}`;
        detail.textContent = entry.reason || (entry.state === "succeeded" ? "Completed successfully" : "HGR Control operation");
        time.dateTime = entry.finishedAt || entry.startedAt; time.textContent = formatTime(entry.finishedAt || entry.startedAt);
        copy.append(title, detail); row.append(dot, copy, time); logsList.append(row);
      }
    } catch (error) {
      if (error.status === 401) return showPairing("Your phone session expired. Pair again.");
      logsList.textContent = ""; const empty = document.createElement("li"); empty.className = "empty-log"; empty.textContent = error.message || "Unable to load logs."; logsList.append(empty);
    } finally { logsButton.disabled = false; }
  }

  pairForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = pairInput.value.trim();
    if (!/^\d{8}$/.test(code)) { setMessage(pairMessage, "Enter the 8-digit code shown on the PC.", "error"); return; }
    pairButton.disabled = true; setMessage(pairMessage, "Pairing securely…");
    try {
      await api("/api/pair", { method: "POST", body: JSON.stringify({ code }) });
      pairInput.value = ""; setMessage(pairMessage, "");
      const ok = await loadStatus();
      if (ok) { setMessage(actionMessage, "Phone paired. HGR Control is ready.", "success"); await loadLogs(); }
    } catch (error) { setMessage(pairMessage, error.message || "Pairing failed.", "error"); }
    finally { pairButton.disabled = false; }
  });

  restartButton.addEventListener("click", async () => {
    restartButton.disabled = true; setMessage(actionMessage, "Restarting HGR on the owner PC…");
    try {
      const result = await api("/api/actions/restart", { method: "POST" });
      setMessage(actionMessage, result.message || "HGR restarted successfully.", "success");
      await Promise.all([loadStatus({ quiet: true }), loadLogs()]);
    } catch (error) {
      if (error.status === 401) return showPairing("Your phone session expired. Pair again.");
      setMessage(actionMessage, error.message || "Restart failed.", "error");
    } finally { restartButton.disabled = false; }
  });

  refreshButton.addEventListener("click", () => void loadStatus());
  logsButton.addEventListener("click", () => void loadLogs());
  forgetButton.addEventListener("click", async () => {
    try { await api("/api/unpair", { method: "POST" }); } catch {}
    showPairing(); setMessage(pairMessage, "This phone was unpaired.", "success");
  });

  window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false; });
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => { deferredInstallPrompt = null; installButton.hidden = true; });

  if ("serviceWorker" in navigator) window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => undefined); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !dashboard.hidden) void loadStatus({ quiet: true }); });
  void loadStatus().then((ok) => { if (ok) void loadLogs(); });
})();
