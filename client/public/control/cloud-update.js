(() => {
  "use strict";

  let selectedDevice = null;
  let lastOperation = null;
  let dismissedOperationId = null;
  let refreshTimer = null;
  let updateInFlight = false;

  const $ = (id) => document.getElementById(id);
  const operationButtons = () => Array.from(document.querySelectorAll(".operation-grid button"));
  const updateButton = () => operationButtons().find((button) => button.textContent?.includes("Update HGR")) || null;
  const ownerRow = () => document.querySelector(".infrastructure-list > div:nth-child(2)");
  const readiness = () => document.querySelector(".operation-readiness > div");

  async function request(path, init = {}) {
    const response = await fetch(path, {
      ...init,
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
    intro.textContent = "Cloud Update attempts, final state, phase and bounded failure diagnostics. Credentials and device secrets are never shown here.";

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
      strong.textContent = `Update HGR · ${stateLabel}`;
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
    const ready = selectedDevice?.approval === "approved" && selectedDevice.online && selectedDevice.localControlOnline;
    const update = updateButton();
    if (update) update.disabled = !ready || busy;
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
    const badge = row?.querySelector("b");
    const button = updateButton();
    selectedDevice = device || null;

    if (!device) {
      removeEnrollmentButtons();
      if (detail) detail.textContent = "Start HGR Control on the owner PC to enroll it";
      if (badge) { badge.textContent = "Not linked"; badge.classList.add("muted"); }
      if (button) button.disabled = true;
      setReadiness("Cloud Update waiting for owner PC", "Start HGR Control on the owner PC. Its outbound bridge will appear here for approval.", false);
      return;
    }

    if (detail) detail.textContent = `${device.machineName}${device.hgrVersion ? ` · HGR ${device.hgrVersion}` : ""}`;
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
    const ready = device.approval === "approved" && device.online && device.localControlOnline;
    if (badge) badge.textContent = device.online ? (device.localControlOnline ? "Online" : "Agent offline") : "Offline";
    if (button) {
      button.disabled = !ready;
      const copy = button.querySelector("small");
      if (copy) copy.textContent = ready ? "Runs the approved owner-PC updater" : "Owner PC must be online";
    }
    setReadiness(
      ready ? "Cloud Update ready" : "Owner PC unavailable",
      ready
        ? "Update HGR is enabled through the outbound owner-PC Control bridge. No arbitrary shell commands are accepted."
        : "The cloud can see this enrolled PC, but Update stays disabled until its local HGR Control Agent is online.",
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

  async function refreshCloudControl() {
    try {
      const [status, operationStatus, operationHistory] = await Promise.all([
        request("/control/cloud/status"),
        request("/control/operation-status").catch(() => ({ operation: null })),
        request("/control/operation-history").catch(() => ({ operations: [] })),
      ]);
      renderDevice(chooseDevice(Array.isArray(status.devices) ? status.devices : []));
      renderOperationHistory(operationHistory.operations);
      const operation = operationStatus.operation || status.activeOperation || null;
      dispatchOperation(operation);
    } catch (error) {
      const button = updateButton();
      if (button) button.disabled = true;
      setReadiness("Cloud Update unavailable", error instanceof Error ? error.message : "Unable to reach the HGR Control relay.", false);
    }
  }

  async function startUpdate() {
    const button = updateButton();
    const device = selectedDevice;
    if (updateInFlight || lastOperation?.state === "running" || !button || !device || device.approval !== "approved" || !device.online || !device.localControlOnline) return;
    const accepted = window.confirm("Update HGR from this owner PC now? This runs the normal validated HGR update + website deployment flow and may briefly restart the live site.");
    if (!accepted) return;

    updateInFlight = true;
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
    $("operationDismiss")?.addEventListener("click", () => {
      if (lastOperation && lastOperation.state !== "running") dismissedOperationId = lastOperation.id;
    });
    void refreshCloudControl();
    refreshTimer = window.setInterval(() => void refreshCloudControl(), 2_500);
  }

  window.addEventListener("pagehide", () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
  }, { once: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
