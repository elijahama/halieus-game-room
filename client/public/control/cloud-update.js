(() => {
  "use strict";

  const REQUEST_TIMEOUT_MS = 10_000;
  const REFRESH_INTERVAL_MS = 2_500;

  let selectedDevice = null;
  let lastOperation = null;
  let dismissedOperationId = null;
  let refreshTimer = null;
  let refreshInFlight = null;
  let updateInFlight = false;
  let pendingRequestAction = null;
  let actorRole = null;
  const LIFECYCLE_ACTIONS = ["start", "restart", "close"];
  const lifecycleButtons = () => Array.from(document.querySelectorAll(".operation-grid button[data-operation]"))
    .filter((button) => LIFECYCLE_ACTIONS.includes(button.dataset.operation));

  const $ = (id) => document.getElementById(id);
  const operationButtons = () => Array.from(document.querySelectorAll(".operation-grid button"));
  const updateButton = () => document.querySelector('.operation-grid button[data-operation="update"]');
  const ownerRow = () => document.querySelector(".infrastructure-list > div:nth-child(2)");
  const readiness = () => document.querySelector(".operation-readiness > div");

  async function request(path, init = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(path, {
        ...init,
        signal: init.signal || controller.signal,
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers || {}),
        },
      });
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      if (!response.ok) {
        const error = new Error(body?.reason || `Control request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return body;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Control status request timed out. Reconnecting…");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function formatWhen(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function styleDiagnosticRow(row) {
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "flex-start";
    row.style.gap = "12px";
    row.style.padding = "5px 0";
  }

  function ensureOperationDiagnostics() {
    const details = $("operationDetails");
    const dismiss = $("operationDismiss");
    if (!details || !dismiss) return null;
    let group = $("controlOperationDiagnostics");
    if (group) return group;

    group = document.createElement("div");
    group.id = "controlOperationDiagnostics";
    group.className = "control-operation-diagnostics";
    group.style.display = "block";
    group.style.padding = "0";

    const phaseRow = document.createElement("div");
    styleDiagnosticRow(phaseRow);
    phaseRow.innerHTML = '<span>Phase</span><strong id="controlOperationPhaseDetail">—</strong>';
    const idRow = document.createElement("div");
    styleDiagnosticRow(idRow);
    idRow.innerHTML = '<span>Operation ID</span><strong id="controlOperationId">—</strong>';
    const reasonRow = document.createElement("div");
    styleDiagnosticRow(reasonRow);
    reasonRow.id = "controlOperationReasonRow";
    reasonRow.hidden = true;
    reasonRow.innerHTML = '<span>Failure reason</span><strong id="controlOperationReason">—</strong>';

    group.append(phaseRow, idRow, reasonRow);
    details.insertBefore(group, dismiss);
    return group;
  }

  function renderOperationDiagnostics(operation) {
    if (!operation) return;
    ensureOperationDiagnostics();
    const phase = $("controlOperationPhaseDetail");
    const id = $("controlOperationId");
    const reason = $("controlOperationReason");
    const reasonRow = $("controlOperationReasonRow");
    if (phase) phase.textContent = operation.phase || "—";
    if (id) {
      const ids = [operation.id ? `Cloud ${operation.id}` : null, operation.localOperationId ? `Local ${operation.localOperationId}` : null].filter(Boolean);
      id.textContent = ids.join(" · ") || "—";
      id.style.maxWidth = "72%";
      id.style.textAlign = "right";
      id.style.overflowWrap = "anywhere";
    }
    if (reasonRow && reason) {
      const failureReason = String(operation.reason || "").trim();
      reasonRow.hidden = !failureReason;
      reason.textContent = failureReason || "—";
      reason.style.maxWidth = "72%";
      reason.style.textAlign = "right";
      reason.style.overflowWrap = "anywhere";
      reason.style.lineHeight = "1.45";
    }
  }

  function ensureOperationAuditPanel() {
    const adminList = $("auditList");
    if (!adminList) return null;
    let panel = $("controlOperationAuditPanel");
    if (panel) return $("controlOperationAuditList");

    panel = document.createElement("section");
    panel.id = "controlOperationAuditPanel";
    panel.className = "panel-card";
    panel.style.marginBottom = "16px";

    const heading = document.createElement("div");
    heading.className = "card-heading";
    const copy = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CONTROL OPERATIONS";
    const title = document.createElement("h2");
    title.textContent = "Owner-PC operation history";
    copy.append(eyebrow, title);
    heading.appendChild(copy);

    const intro = document.createElement("p");
    intro.style.color = "#78869e";
    intro.style.fontSize = "11px";
    intro.style.lineHeight = "1.55";
    intro.textContent = "Approved owner-PC Update, Start, Restart and Close operations, with results and bounded failure diagnostics. Credentials and device secrets are never shown here.";

    const list = document.createElement("div");
    list.id = "controlOperationAuditList";
    list.className = "audit-list";
    list.style.marginTop = "14px";
    list.innerHTML = '<div class="empty-state">Loading Control operation history…</div>';

    panel.append(heading, intro, list);
    adminList.parentNode?.insertBefore(panel, adminList);
    return list;
  }

  function renderOperationHistory(operations) {
    const list = ensureOperationAuditPanel();
    if (!list) return;
    list.textContent = "";
    const entries = Array.isArray(operations) ? operations : [];
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No Control operations recorded yet.";
      list.appendChild(empty);
      return;
    }

    entries.slice(0, 40).forEach((operation) => {
      const row = document.createElement("article");
      row.className = "audit-entry control-operation-entry";
      const time = document.createElement("time");
      time.textContent = formatWhen(operation.startedAt);
      const copy = document.createElement("div");
      const state = String(operation.state || "running");
      const stateLabel = state[0]?.toUpperCase() + state.slice(1);
      const strong = document.createElement("strong");
      const action = String(operation.action || "update");
      const actionName = action === "start" ? "Open HGR window"
        : action === "restart" ? "Restart HGR window"
          : action === "close" ? "Close HGR window" : "Update HGR";
      strong.textContent = `${actionName} · ${stateLabel}`;
      const phase = document.createElement("small");
      phase.textContent = `${operation.phase || "Unknown phase"} · ${Math.round(Number(operation.progress) || 0)}%`;
      const identity = document.createElement("small");
      identity.textContent = `Operation ${operation.id || "—"}${operation.localOperationId ? ` · Local ${operation.localOperationId}` : ""}`;
      identity.style.overflowWrap = "anywhere";
      copy.append(strong, phase, identity);
      const reasonText = String(operation.reason || "").trim();
      if (reasonText) {
        const reason = document.createElement("small");
        reason.textContent = `Reason: ${reasonText}`;
        reason.style.color = state === "failed" || state === "rejected" ? "#f0a2a2" : "#9aa9c1";
        reason.style.marginTop = "6px";
        reason.style.lineHeight = "1.5";
        reason.style.overflowWrap = "anywhere";
        copy.appendChild(reason);
      }
      row.append(time, copy);
      list.appendChild(row);
    });
  }

  function syncActionAvailability() {
    const busy = updateInFlight || lastOperation?.state === "running";
    // All Control actions share one audit channel, but only Update can animate
    // the Update tile. Start/Restart/Close must never impersonate deployment.
    const updateBusy = (updateInFlight && pendingRequestAction === "update")
      || (lastOperation?.action === "update" && lastOperation.state === "running");
    // A local browser-window lifecycle request is NEVER a software update.
    const ready = selectedDevice?.approval === "approved" && selectedDevice.online && selectedDevice.localControlOnline;
    const update = updateButton();
    for (const button of lifecycleButtons()) {
      const enabled = ready && !busy && actorRole === "owner";
      button.disabled = !enabled;
      const copy = button.querySelector("small");
      if (copy) copy.textContent = enabled ? "Ready · requires owner confirmation"
        : actorRole !== "owner" ? "Owner account required"
          : !ready ? "Reconnect approved owner-PC bridge" : "Control operation already running";
      button.title = enabled ? "Runs this fixed owner-PC action after explicit confirmation."
        : "Owner approval and a connected local Control Agent are required.";
    }
    if (update) {
      update.disabled = !ready || busy;
      update.dataset.updateState = updateBusy ? "running" : "idle";
      const copy = update.querySelector("small");
      if (copy && ready) copy.textContent = updateBusy ? "Update in progress · awaiting owner PC"
        : busy ? "Another owner-PC action is running" : "Ready · run the approved updater";
      update.title = updateBusy ? "An update is already being tracked. See its progress above."
        : busy ? "Wait for the current owner-PC action to finish."
          : ready ? "Update HGR on the owner PC" : "Approve enrollment and connect owner-PC Control first.";
    }
    const revoke = $("revokeCloudOwnerPc");
    if (revoke) {
      revoke.disabled = busy;
      revoke.title = busy ? "Wait for the active update to finish before revoking access." : "";
    }
  }

  function dispatchOperation(operation) {
    lastOperation = operation;
    syncActionAvailability();
    if (!operation || operation.id === dismissedOperationId) return;
    window.dispatchEvent(new CustomEvent("hgr-control-operation", { detail: operation }));
    renderOperationDiagnostics(operation);
  }

  function setReadiness(title, copy, live = false) {
    const container = readiness();
    if (!container) return;
    const dot = container.querySelector(".status-dot");
    const strong = container.querySelector("strong");
    const small = container.querySelector("small");
    dot?.classList.toggle("is-live", live);
    if (strong) strong.textContent = title;
    if (small) small.textContent = copy;
  }

  function removeEnrollmentButtons() {
    $("approveCloudOwnerPc")?.remove();
    $("revokeCloudOwnerPc")?.remove();
  }

  function showApproveButton(device) {
    const container = readiness();
    if (!container || $("approveCloudOwnerPc")) return;
    const button = document.createElement("button");
    button.id = "approveCloudOwnerPc";
    button.type = "button";
    button.className = "secondary-action";
    button.textContent = "Approve owner PC";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await request(`/control/cloud/devices/${encodeURIComponent(device.deviceId)}/approve`, { method: "POST", body: "{}" });
        await refreshCloudControl();
      } catch (error) {
        setReadiness("Owner-PC approval failed", error instanceof Error ? error.message : "Unable to approve this owner PC.", false);
      } finally {
        button.disabled = false;
      }
    });
    container.appendChild(button);
  }

  function showRevokeButton(device, pending = false) {
    const container = readiness();
    if (!container || $("revokeCloudOwnerPc")) return;
    const button = document.createElement("button");
    button.id = "revokeCloudOwnerPc";
    button.type = "button";
    button.className = "secondary-action";
    button.textContent = pending ? "Reject enrollment" : "Revoke cloud access";
    button.addEventListener("click", async () => {
      const accepted = window.confirm(
        pending
          ? `Reject the pending Cloud Control enrollment for ${device.machineName || "this owner PC"}? This credential will be permanently blocked.`
          : `Revoke Cloud Control access for ${device.machineName || "this owner PC"}? Future cloud requests from this enrollment will be blocked and a fresh enrollment will be required before using Cloud Control again.`,
      );
      if (!accepted) return;
      button.disabled = true;
      try {
        await request(`/control/cloud/devices/${encodeURIComponent(device.deviceId)}/revoke`, { method: "POST", body: "{}" });
        await refreshCloudControl();
      } catch (error) {
        setReadiness("Owner-PC revocation failed", error instanceof Error ? error.message : "Unable to revoke this owner-PC enrollment.", false);
      } finally {
        button.disabled = false;
      }
    });
    container.appendChild(button);
  }

  function renderDevice(device) {
    const row = ownerRow();
    const detail = $("ownerPcDetail");
    const checkout = $("ownerPcCheckout");
    const release = $("ownerReleaseCheckout");
    const releaseBadge = $("ownerReleaseBadge");
    const badge = row?.querySelector("b");
    const button = updateButton();
    selectedDevice = device || null;

    if (!device) {
      removeEnrollmentButtons();
      if (detail) detail.textContent = "Start HGR Control on the owner PC to enroll it";
      if (checkout) { checkout.textContent = "Awaiting source report"; }
      if (release) release.textContent = "Awaiting live laptop report";
      if (releaseBadge) { releaseBadge.textContent = "Unverified"; releaseBadge.classList.add("muted"); }
      if (badge) { badge.textContent = "Not linked"; badge.classList.add("muted"); }
      if (button) button.disabled = true;
      setReadiness("Cloud Update waiting for owner PC", "Start HGR Control on the owner PC. Its outbound bridge will appear here for approval.", false);
      return;
    }

    // This device.hgrVersion comes from HGR_CONTROL_GAME_ROOT, the separate
    // owner-PC development checkout. It is not the publicly deployed version
    // and must not be presented as the installed/released Game Room version.
    if (detail) detail.textContent = `${device.machineName || "Owner PC"} · Control bridge`;
    if (checkout) {
      checkout.textContent = device.hgrVersion && device.hgrVersion !== "unknown"
        ? `Version ${device.hgrVersion} · preserved original source`
        : "Version not reported by the original checkout";
    }
    // This value is signed-in agent-reported VERSION from the actual release
    // checkout, not an alias for the website or the development worktree.
    const reportedRelease = typeof device.releaseCheckoutVersion === "string"
      && /^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$/.test(device.releaseCheckoutVersion)
      ? device.releaseCheckoutVersion : null;
    const fresh = device.online === true && device.localControlOnline === true;
    if (release) release.textContent = reportedRelease
      ? `${fresh ? "Version" : "Last reported"} ${reportedRelease}`
      : "Not reported by the current laptop bridge";
    if (releaseBadge) {
      releaseBadge.textContent = reportedRelease ? (fresh ? "Reported" : "Stale") : "Unverified";
      releaseBadge.classList.toggle("muted", !fresh || !reportedRelease);
    }
    if (badge) badge.classList.remove("muted");

    if (device.approval === "pending") {
      removeEnrollmentButtons();
      if (badge) badge.textContent = "Approve";
      if (button) button.disabled = true;
      setReadiness("Owner PC awaiting approval", "Approve this machine once from an owner/admin session before Cloud Update can dispatch anything.", false);
      showApproveButton(device);
      showRevokeButton(device, true);
      return;
    }

    if (device.approval === "revoked") {
      removeEnrollmentButtons();
      if (badge) { badge.textContent = "Revoked"; badge.classList.add("muted"); }
      if (button) {
        button.disabled = true;
        const copy = button.querySelector("small");
        if (copy) copy.textContent = "Owner-PC enrollment revoked";
      }
      setReadiness(
        "Owner-PC enrollment revoked",
        "This credential is blocked from Cloud Control. A fresh owner-PC enrollment must be approved before cloud operations can be used again.",
        false,
      );
      return;
    }

    removeEnrollmentButtons();
    showRevokeButton(device);
    // These are agent/bridge health signals, NOT a test of whether the
    // Windows computer is switched on or reachable through other apps.
    const bridgeConnected = Boolean(device.online);
    const controlConnected = Boolean(device.localControlOnline);
    const ready = device.approval === "approved" && bridgeConnected && controlConnected;
    if (badge) badge.textContent = !bridgeConnected
      ? "Bridge disconnected"
      : controlConnected ? "Online" : "Control disconnected";
    if (button) {
      button.disabled = !ready;
      const copy = button.querySelector("small");
      if (copy) copy.textContent = ready
        ? "Runs the approved owner-PC updater"
        : bridgeConnected ? "Reconnect local HGR Control Agent" : "Reconnect outbound HGR Control bridge";
    }
    setReadiness(
      ready ? "Owner-PC Control ready" : bridgeConnected ? "Control Agent disconnected" : "Cloud bridge disconnected",
      ready
        ? "Update HGR is enabled through the outbound owner-PC Control bridge. No arbitrary shell commands are accepted."
        : bridgeConnected
          ? "The enrolled PC bridge is connected, but the local HGR Control Agent is unavailable. The PC itself may be online."
          : "The website has not received a recent heartbeat from the Control bridge. This does not mean the PC is turned off.",
      ready,
    );
  }

  function chooseDevice(devices) {
    const approved = devices.find((device) => device.approval === "approved" && device.online)
      || devices.find((device) => device.approval === "approved")
      || devices.find((device) => device.approval === "pending")
      || devices.find((device) => device.approval === "revoked");
    return approved || null;
  }

  async function doRefreshCloudControl() {
    try {
      const [status, operationStatus, operationHistory] = await Promise.all([
        request("/control/cloud/status"),
        request("/control/operation-status").catch(() => ({ operation: null })),
        request("/control/operation-history").catch(() => ({ operations: [] })),
      ]);
      actorRole = status.actorRole || null;
      renderDevice(chooseDevice(Array.isArray(status.devices) ? status.devices : []));
      // Cloud lifecycle receipts are durable on Oracle; local Control audit is
      // supplementary, never a prerequisite for observing terminal success.
      const history = new Map();
      for (const entry of [...(Array.isArray(status.operations) ? status.operations : []),
        ...(Array.isArray(operationHistory.operations) ? operationHistory.operations : [])]) {
        if (entry?.id) history.set(entry.id, entry);
      }
      renderOperationHistory([...history.values()].sort((a, b) =>
        String(b.startedAt || "").localeCompare(String(a.startedAt || ""))));
      const operation = operationStatus.operation || status.activeOperation || null;
      dispatchOperation(operation);
    } catch (error) {
      const button = updateButton();
      if (button) button.disabled = true;
      const running = lastOperation?.state === "running";
      setReadiness(
        running ? "Cloud Update reconnecting" : "Cloud Update unavailable",
        error instanceof Error ? error.message : "Unable to reach the HGR Control relay.",
        false,
      );
    }
  }

  function refreshCloudControl() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = doRefreshCloudControl().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  function stopRefreshLoop() {
    if (!refreshTimer) return;
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function startRefreshLoop(immediate = true) {
    stopRefreshLoop();
    if (immediate) void refreshCloudControl();
    refreshTimer = window.setInterval(() => void refreshCloudControl(), REFRESH_INTERVAL_MS);
  }

  async function startLifecycle(action) {
    if (!LIFECYCLE_ACTIONS.includes(action) || updateInFlight || lastOperation?.state === "running"
      || actorRole !== "owner") return;
    const device = selectedDevice;
    if (!device || device.approval !== "approved" || !device.online || !device.localControlOnline) return;
    const label = action[0].toUpperCase() + action.slice(1);
    if (!window.confirm(`${label} the dedicated HGR browser window on the enrolled owner PC? This only changes the local Edge app window. It does NOT start, stop or restart the Oracle website or game server.`)) return;
    updateInFlight = true;
    pendingRequestAction = action;
    syncActionAvailability();
    try {
      const confirmation = await request(`/control/cloud/actions/${action}/confirm`, {
        method: "POST", body: JSON.stringify({ deviceId: device.deviceId }),
      });
      const queued = await request(`/control/cloud/actions/${action}`, {
        method: "POST", body: JSON.stringify({ deviceId: device.deviceId, confirmationId: confirmation.confirmationId }),
      });
      dismissedOperationId = null;
      if (queued.operation) dispatchOperation(queued.operation);
      await refreshCloudControl();
    } catch (error) {
      setReadiness(`${label} was not started`, error instanceof Error ? error.message : "Control action refused.", false);
    } finally {
      updateInFlight = false;
      pendingRequestAction = null;
      await refreshCloudControl();
    }
  }

  async function startUpdate() {
    const button = updateButton();
    const device = selectedDevice;
    if (updateInFlight || lastOperation?.state === "running" || !button || !device || device.approval !== "approved" || !device.online || !device.localControlOnline) return;
    const accepted = window.confirm("Update HGR from this owner PC now? This runs the normal validated HGR update + website deployment flow and may briefly restart the live site.");
    if (!accepted) return;

    updateInFlight = true;
    pendingRequestAction = "update";
    syncActionAvailability();
    try {
      const confirmation = await request("/control/cloud/actions/update/confirm", {
        method: "POST",
        body: JSON.stringify({ deviceId: device.deviceId }),
      });
      const queued = await request("/control/cloud/actions/update", {
        method: "POST",
        body: JSON.stringify({ deviceId: device.deviceId, confirmationId: confirmation.confirmationId }),
      });
      dismissedOperationId = null;
      if (queued.operation) dispatchOperation(queued.operation);
      await refreshCloudControl();
    } catch (error) {
      setReadiness("Update was not started", error instanceof Error ? error.message : "Cloud Update request failed.", false);
    } finally {
      updateInFlight = false;
      pendingRequestAction = null;
      await refreshCloudControl();
    }
  }

  function bind() {
    ensureOperationDiagnostics();
    ensureOperationAuditPanel();
    const button = updateButton();
    if (button) {
      button.disabled = true;
      button.addEventListener("click", () => void startUpdate());
    }
    for (const lifecycle of lifecycleButtons()) {
      lifecycle.disabled = true;
      lifecycle.addEventListener("click", () => void startLifecycle(lifecycle.dataset.operation));
    }
    $("operationDismiss")?.addEventListener("click", () => {
      if (lastOperation && lastOperation.state !== "running") dismissedOperationId = lastOperation.id;
    });
    startRefreshLoop(true);
  }

  window.addEventListener("pagehide", stopRefreshLoop);
  window.addEventListener("pageshow", () => startRefreshLoop(true));
  window.addEventListener("online", () => startRefreshLoop(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") startRefreshLoop(true);
    else stopRefreshLoop();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();