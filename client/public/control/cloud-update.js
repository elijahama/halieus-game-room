(() => {
  "use strict";

  let selectedDevice = null;
  let lastOperation = null;
  let dismissedOperationId = null;
  let refreshTimer = null;

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

  function dispatchOperation(operation) {
    if (!operation || operation.id === dismissedOperationId) return;
    lastOperation = operation;
    window.dispatchEvent(new CustomEvent("hgr-control-operation", { detail: operation }));
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

  function removeApproveButton() {
    $("approveCloudOwnerPc")?.remove();
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

  function renderDevice(device) {
    const row = ownerRow();
    const detail = $("ownerPcDetail");
    const badge = row?.querySelector("b");
    const button = updateButton();
    selectedDevice = device || null;

    if (!device) {
      removeApproveButton();
      if (detail) detail.textContent = "Start HGR Control on the owner PC to enroll it";
      if (badge) { badge.textContent = "Not linked"; badge.classList.add("muted"); }
      if (button) button.disabled = true;
      setReadiness("Cloud Update waiting for owner PC", "Start HGR Control on the owner PC. Its outbound bridge will appear here for approval.", false);
      return;
    }

    if (detail) detail.textContent = `${device.machineName}${device.hgrVersion ? ` · HGR ${device.hgrVersion}` : ""}`;
    if (badge) badge.classList.remove("muted");

    if (device.approval === "pending") {
      if (badge) badge.textContent = "Approve";
      if (button) button.disabled = true;
      setReadiness("Owner PC awaiting approval", "Approve this machine once from an owner/admin session before Cloud Update can dispatch anything.", false);
      showApproveButton(device);
      return;
    }

    removeApproveButton();
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
      || devices.find((device) => device.approval === "pending");
    return approved || null;
  }

  async function refreshCloudControl() {
    try {
      const [status, operationStatus] = await Promise.all([
        request("/control/cloud/status"),
        request("/control/operation-status").catch(() => ({ operation: null })),
      ]);
      renderDevice(chooseDevice(Array.isArray(status.devices) ? status.devices : []));
      const operation = operationStatus.operation || status.activeOperation || null;
      if (operation) dispatchOperation(operation);
    } catch (error) {
      const button = updateButton();
      if (button) button.disabled = true;
      setReadiness("Cloud Update unavailable", error instanceof Error ? error.message : "Unable to reach the HGR Control relay.", false);
    }
  }

  async function startUpdate() {
    const button = updateButton();
    const device = selectedDevice;
    if (!button || !device || device.approval !== "approved" || !device.online || !device.localControlOnline) return;
    const accepted = window.confirm("Update HGR from this owner PC now? This runs the normal validated HGR update + website deployment flow and may briefly restart the live site.");
    if (!accepted) return;

    button.disabled = true;
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
      await refreshCloudControl();
    }
  }

  function bind() {
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
