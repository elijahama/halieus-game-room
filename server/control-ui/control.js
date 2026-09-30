(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const pairPanel = byId("pairPanel");
  const dashboard = byId("dashboard");
  const pairForm = byId("pairForm");
  const pairInput = byId("pairCode");
  const pairButton = byId("pairButton");
  const pairMessage = byId("pairMessage");
  const actionMessage = byId("actionMessage");
  const connectionPill = byId("connectionPill");
  const startButton = byId("startButton");
  const restartButton = byId("restartButton");
  const closeButton = byId("closeButton");
  const updateButton = byId("updateButton");
  const refreshButton = byId("refreshButton");
  const logsButton = byId("logsButton");
  const forgetButton = byId("forgetButton");
  const installButton = byId("installButton");
  const logsList = byId("logsList");
  const operationPanel = byId("operationPanel");
  const operationAction = byId("operationAction");
  const operationPercent = byId("operationPercent");
  const operationProgress = byId("operationProgress");
  const operationPhase = byId("operationPhase");
  const confirmDialog = byId("confirmDialog");
  const confirmTitle = byId("confirmTitle");
  const confirmCopy = byId("confirmCopy");
  const confirmAcceptButton = byId("confirmAcceptButton");
  const introSplash = byId("introSplash");
  const introStatus = byId("introStatus");

  const actionButtons = [startButton, restartButton, closeButton, updateButton];
  const introStartedAt = Date.now();
  let introFinished = false;
  let deferredInstallPrompt = null;
  let operationPollTimer = null;

  function setMessage(element, text, tone = "") {
    element.textContent = text || "";
    element.classList.toggle("is-error", tone === "error");
    element.classList.toggle("is-success", tone === "success");
  }

  function setConnection(state, label) {
    connectionPill.textContent = label;
    connectionPill.className =
      "status-pill " +
      (state === "online"
        ? "is-online"
        : state === "offline"
          ? "is-offline"
          : "is-checking");
  }

  function finishIntro(label) {
    if (introFinished) return;
    introFinished = true;
    introStatus.textContent = label;
    const minimumVisibleMs = 760;
    const delay = Math.max(0, minimumVisibleMs - (Date.now() - introStartedAt));
    window.setTimeout(() => {
      introSplash.classList.add("is-done");
      window.setTimeout(() => {
        introSplash.hidden = true;
      }, 360);
    }, delay);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    if (!response.ok) {
      const error = new Error(
        body && body.reason ? body.reason : `Request failed (${response.status}).`,
      );
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }

  function showPairing(message = "") {
    pairPanel.hidden = false;
    dashboard.hidden = true;
    setConnection("offline", "Pair phone");
    if (message) setMessage(pairMessage, message, "error");
    window.setTimeout(() => pairInput.focus(), 50);
  }

  function showDashboard() {
    pairPanel.hidden = true;
    dashboard.hidden = false;
    setConnection("online", "Connected");
  }

  function renderOperation(activeOperation) {
    const busy = Boolean(activeOperation);
    for (const button of actionButtons) button.disabled = busy;

    if (!activeOperation) {
      operationPanel.hidden = true;
      return;
    }

    const progress = Number.isFinite(activeOperation.progress)
      ? Math.max(0, Math.min(100, activeOperation.progress))
      : 5;
    operationPanel.hidden = false;
    operationAction.textContent = activeOperation.action || "operation";
    operationPercent.textContent = `${progress}%`;
    operationProgress.style.width = `${progress}%`;
    operationPhase.textContent = activeOperation.phase || "Working on the owner PC…";
  }

  function renderStatus(status) {
    byId("versionValue").textContent = status.hgrVersion || "—";
    byId("machineValue").textContent =
      status.machine && status.machine.name ? status.machine.name : "—";
    byId("branchValue").textContent =
      status.repository && status.repository.branch ? status.repository.branch : "—";
    byId("commitValue").textContent =
      status.repository && status.repository.commit
        ? status.repository.commit
        : "Commit unavailable";
    const dirty = status.repository ? status.repository.dirty : null;
    byId("repoStateValue").textContent =
      dirty === true ? "Changed" : dirty === false ? "Clean" : "Unknown";
    renderOperation(status.activeOperation || null);
  }

  function queueOperationPoll() {
    if (operationPollTimer) return;
    operationPollTimer = window.setTimeout(async () => {
      operationPollTimer = null;
      try {
        const status = await api("/api/status");
        renderStatus(status);
        showDashboard();
        if (status.activeOperation) {
          queueOperationPoll();
          return;
        }

        const entries = await loadLogs();
        const latest = Array.isArray(entries) ? entries[0] : null;
        if (latest && latest.state === "succeeded") {
          setMessage(
            actionMessage,
            `${latest.action} completed successfully on the owner PC.`,
            "success",
          );
        } else if (latest && (latest.state === "failed" || latest.state === "rejected")) {
          setMessage(
            actionMessage,
            latest.reason || `${latest.action} did not complete.`,
            "error",
          );
        }
      } catch (error) {
        if (error.status === 401) {
          showPairing("Your phone session expired. Pair again.");
          return;
        }
        setConnection("offline", "Offline");
        setMessage(
          actionMessage,
          error.message || "Unable to read operation progress.",
          "error",
        );
      }
    }, 1300);
  }

  async function loadStatus({ quiet = false, monitor = true } = {}) {
    if (!quiet) setConnection("checking", "Checking");
    try {
      const status = await api("/api/status");
      renderStatus(status);
      showDashboard();
      if (monitor && status.activeOperation) queueOperationPoll();
      return status;
    } catch (error) {
      if (error.status === 401) {
        showPairing();
        return null;
      }
      setConnection("offline", "Offline");
      if (!quiet) {
        setMessage(
          pairMessage,
          error.message || "Unable to reach HGR Control.",
          "error",
        );
      }
      return null;
    }
  }

  function formatTime(value) {
    try {
      return new Intl.DateTimeFormat([], {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "";
    }
  }

  async function loadLogs() {
    logsButton.disabled = true;
    try {
      const result = await api("/api/logs");
      const entries = Array.isArray(result.entries) ? result.entries : [];
      logsList.textContent = "";
      if (entries.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-log";
        empty.textContent = "No Control operations recorded yet.";
        logsList.append(empty);
        return entries;
      }

      for (const entry of entries.slice(0, 10)) {
        const row = document.createElement("li");
        row.className = "is-" + entry.state;
        const dot = document.createElement("i");
        dot.setAttribute("aria-hidden", "true");
        const copy = document.createElement("span");
        const title = document.createElement("strong");
        const detail = document.createElement("small");
        const time = document.createElement("time");

        title.textContent = `${entry.action} · ${entry.state}`;
        detail.textContent =
          entry.reason ||
          (entry.state === "succeeded"
            ? "Completed successfully"
            : "HGR Control operation");
        detail.title = detail.textContent;
        time.dateTime = entry.finishedAt || entry.startedAt;
        time.textContent = formatTime(entry.finishedAt || entry.startedAt);
        copy.append(title, detail);
        row.append(dot, copy, time);
        logsList.append(row);
      }
      return entries;
    } catch (error) {
      if (error.status === 401) {
        showPairing("Your phone session expired. Pair again.");
        return [];
      }
      logsList.textContent = "";
      const empty = document.createElement("li");
      empty.className = "empty-log";
      empty.textContent = error.message || "Unable to load logs.";
      logsList.append(empty);
      return [];
    } finally {
      logsButton.disabled = false;
    }
  }

  function askForConfirmation(title, copy, acceptLabel, action) {
    confirmTitle.textContent = title;
    confirmCopy.textContent = copy;
    confirmAcceptButton.textContent = acceptLabel;
    confirmDialog.classList.toggle("is-close", action === "close");
    confirmDialog.classList.toggle("is-update", action === "update");

    if (typeof confirmDialog.showModal !== "function") {
      return Promise.resolve(window.confirm(`${title}\n\n${copy}`));
    }

    return new Promise((resolve) => {
      const onClose = () => {
        resolve(confirmDialog.returnValue === "confirm");
      };
      confirmDialog.addEventListener("close", onClose, { once: true });
      confirmDialog.showModal();
    });
  }

  async function runSimpleAction(action, pendingCopy) {
    for (const button of actionButtons) button.disabled = true;
    setMessage(actionMessage, pendingCopy);
    try {
      const result = await api(`/api/actions/${action}`, { method: "POST" });
      setMessage(
        actionMessage,
        result.message || `${action} completed successfully.`,
        "success",
      );
      await Promise.all([loadStatus({ quiet: true }), loadLogs()]);
    } catch (error) {
      if (error.status === 401) {
        showPairing("Your phone session expired. Pair again.");
        return;
      }
      setMessage(
        actionMessage,
        error.message || `${action} failed.`,
        "error",
      );
    } finally {
      for (const button of actionButtons) button.disabled = false;
    }
  }

  async function runConfirmedAction(action, title, copy, acceptLabel) {
    const accepted = await askForConfirmation(title, copy, acceptLabel, action);
    if (!accepted) return;

    for (const button of actionButtons) button.disabled = true;
    setMessage(actionMessage, `Preparing secure ${action} confirmation…`);
    try {
      const challenge = await api("/api/confirm", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const result = await api(`/api/actions/${action}`, {
        method: "POST",
        body: JSON.stringify({ confirmation: challenge.confirmation }),
      });

      if (action === "update") {
        setMessage(
          actionMessage,
          result.message || "HGR Update started on the owner PC.",
          "success",
        );
        const status = await loadStatus({ quiet: true });
        if (status && status.activeOperation) queueOperationPoll();
        await loadLogs();
      } else {
        setMessage(
          actionMessage,
          result.message || "HGR closed successfully.",
          "success",
        );
        await Promise.all([loadStatus({ quiet: true }), loadLogs()]);
      }
    } catch (error) {
      if (error.status === 401) {
        showPairing("Your phone session expired. Pair again.");
        return;
      }
      const files =
        error.body && Array.isArray(error.body.files) && error.body.files.length
          ? ` Files: ${error.body.files.join(", ")}`
          : "";
      setMessage(
        actionMessage,
        (error.message || `${action} failed.`) + files,
        "error",
      );
    } finally {
      const statusBusy = !operationPanel.hidden;
      for (const button of actionButtons) button.disabled = statusBusy;
    }
  }

  pairForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = pairInput.value.trim();
    if (!/^\d{8}$/.test(code)) {
      setMessage(
        pairMessage,
        "Enter the 8-digit code shown on the PC.",
        "error",
      );
      return;
    }

    pairButton.disabled = true;
    setMessage(pairMessage, "Pairing securely…");
    try {
      await api("/api/pair", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      pairInput.value = "";
      setMessage(pairMessage, "");
      const status = await loadStatus();
      if (status) {
        setMessage(
          actionMessage,
          "Phone paired. HGR Control is ready.",
          "success",
        );
        await loadLogs();
      }
    } catch (error) {
      setMessage(
        pairMessage,
        error.message || "Pairing failed.",
        "error",
      );
    } finally {
      pairButton.disabled = false;
    }
  });

  startButton.addEventListener("click", () =>
    void runSimpleAction("start", "Starting HGR on the owner PC…"),
  );

  restartButton.addEventListener("click", () =>
    void runSimpleAction("restart", "Restarting HGR on the owner PC…"),
  );

  closeButton.addEventListener("click", () =>
    void runConfirmedAction(
      "close",
      "Close HGR on the PC?",
      "This closes the dedicated HGR app window. The Control Agent stays online so you can start it again remotely.",
      "Close HGR",
    ),
  );

  updateButton.addEventListener("click", () =>
    void runConfirmedAction(
      "update",
      "Run the full HGR update?",
      "This will sync GitHub, validate the release, build, run regressions, package and deploy to Oracle. Connected HGR clients are warned before restart and refresh themselves onto the new release.",
      "Run update",
    ),
  );

  refreshButton.addEventListener("click", () => void loadStatus());
  logsButton.addEventListener("click", () => void loadLogs());

  forgetButton.addEventListener("click", async () => {
    try {
      await api("/api/unpair", { method: "POST" });
    } catch {}
    showPairing();
    setMessage(pairMessage, "This phone was unpaired.", "success");
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !dashboard.hidden) {
      void loadStatus({ quiet: true });
    }
  });

  void (async () => {
    const status = await loadStatus({ quiet: true });
    if (status) {
      finishIntro("Secure link ready");
      await loadLogs();
      return;
    }

    finishIntro(
      connectionPill.textContent === "Pair phone"
        ? "Pairing required"
        : "Owner PC unavailable",
    );
  })();
})();
