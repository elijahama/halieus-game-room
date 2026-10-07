(() => {
  "use strict";

  const state = {
    account: null,
    snapshot: null,
    rooms: [],
    stats: null,
    health: null,
    samples: [],
    activeOperation: null,
    currentSection: "overview",
  };

  const $ = (id) => document.getElementById(id);
  const queryAll = (selector) => Array.from(document.querySelectorAll(selector));
  const OPERATION_TOAST_MINIMIZED_KEY = "hgr-control-operation-toast-minimized";
  const OPERATION_TOAST_CORNER_KEY = "hgr-control-operation-toast-corner";
  const OPERATION_TOAST_CORNERS = new Set(["top-left", "top-right", "bottom-left", "bottom-right"]);
  let operationToastClickSuppressedUntil = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node?.firstChild) node.removeChild(node.firstChild);
  }

  async function api(path) {
    const response = await fetch(path, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok) {
      const error = new Error(body?.reason || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function showAccess(title, copy) {
    $("accessTitle").textContent = title;
    $("accessCopy").textContent = copy;
    $("accessState").hidden = false;
  }

  function hideAccess() {
    $("accessState").hidden = true;
  }

  function formatUptime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function formatWhen(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function normalise(value) {
    return String(value || "").trim().toLocaleLowerCase();
  }

  function gamePath(room) {
    const code = encodeURIComponent(room.code);
    if (room.game === "mega-board") return `/game/${code}`;
    return `/${encodeURIComponent(room.game)}/${code}`;
  }

  function spectatePath(room) {
    const code = encodeURIComponent(room.code);
    if (room.game === "mega-board") return `/spectate/mega/${code}`;
    return gamePath(room);
  }

  function roomDuration(room) {
    const start = Number(room.startedAt || room.createdAt || 0);
    if (!start) return "—";
    const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 60)}m`;
  }

  function currentRoom() {
    const name = normalise(state.account?.displayName);
    if (!name) return null;
    return state.rooms.find((room) => room.humanPlayers?.some((player) => normalise(player) === name)) || null;
  }

  function setSection(section) {
    state.currentSection = section;
    queryAll(".control-section").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === section));
    queryAll("[data-section]").forEach((button) => button.classList.toggle("is-active", button.dataset.section === section));
    const titles = {
      overview: "Control overview",
      live: "Live HGR",
      games: "Games hub",
      players: "Players",
      performance: "Performance centre",
      operations: "Operations",
      audit: "Audit history",
    };
    $("sectionTitle").textContent = titles[section] || "HGR Control";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAvatar(container, account) {
    clear(container);
    const fallback = account.avatar || account.displayName?.slice(0, 2).toUpperCase() || "?";
    if (account.playerColor) container.style.background = account.playerColor;
    if (!account.profilePicture) { container.textContent = fallback; return; }
    const image = document.createElement("img");
    image.alt = "";
    image.src = account.profilePicture;
    image.addEventListener("error", () => { container.textContent = fallback; }, { once: true });
    container.appendChild(image);
  }

  function renderIdentity() {
    const account = state.account;
    if (!account) return;
    $("profileName").textContent = account.displayName;
    $("profileRole").textContent = account.role === "owner" ? "Halieus owner" : "Administrator";
    renderAvatar($("profileAvatar"), account);
  }

  function renderNowPlaying() {
    const room = currentRoom();
    const body = $("nowPlayingBody");
    const gamesCurrent = $("gamesCurrent");
    clear(body);
    clear(gamesCurrent);

    if (!room) {
      $("nowPlayingTitle").textContent = "No active game";
      $("nowPlayingBadge").textContent = "IDLE";
      $("nowPlayingBadge").classList.remove("is-live");
      $("nowPlayingActions").hidden = true;
      body.appendChild(element("p", "", "Your active HGR game will appear here automatically when this account is seated in a live room."));
      const heading = element("div", "card-heading");
      const headingCopy = element("div");
      headingCopy.append(element("p", "eyebrow", "CURRENT GAME"), element("h2", "", "Nothing active right now"));
      heading.appendChild(headingCopy);
      gamesCurrent.appendChild(heading);
      gamesCurrent.appendChild(element("p", "empty-state", "Start or join an HGR game and it will be tracked here live."));
      return;
    }

    $("nowPlayingTitle").textContent = room.gameTitle;
    $("nowPlayingBadge").textContent = room.started ? "PLAYING" : "LOBBY";
    $("nowPlayingBadge").classList.add("is-live");
    $("nowPlayingActions").hidden = false;
    $("openGameAction").href = gamePath(room);
    $("spectateGameAction").href = spectatePath(room);
    $("spectateGameAction").hidden = !room.spectatable;

    const intro = element("p", "", `Room ${room.code} · ${room.phase || (room.started ? "playing" : "lobby")}`);
    const meta = element("div", "now-playing-meta");
    [
      `${room.playerCount}/${room.maximumPlayers} seats`,
      `${room.spectatorCount || 0} spectator${room.spectatorCount === 1 ? "" : "s"}`,
      room.matchMode || "casual",
      roomDuration(room),
    ].forEach((value) => meta.appendChild(element("span", "", value)));
    body.append(intro, meta);

    const heading = element("div", "card-heading");
    const headingCopy = element("div");
    headingCopy.append(element("p", "eyebrow", "CURRENT GAME"), element("h2", "", room.gameTitle));
    heading.append(headingCopy, element("span", "live-badge is-live", room.started ? "PLAYING" : "LOBBY"));
    const description = element("p", "", `Room ${room.code} · ${room.playerCount} player${room.playerCount === 1 ? "" : "s"} · ${roomDuration(room)}`);
    const action = element("a", "primary-action", "Open current game");
    action.href = gamePath(room);
    gamesCurrent.append(heading, description, action);
  }

  function renderRooms() {
    const overview = $("overviewLiveGames");
    const grid = $("liveRoomGrid");
    clear(overview);
    clear(grid);

    if (!state.rooms.length) {
      overview.appendChild(element("div", "empty-state", "No live rooms right now."));
      grid.appendChild(element("div", "empty-state", "No live rooms right now."));
      return;
    }

    state.rooms.slice(0, 5).forEach((room) => {
      const row = element("div", "compact-game");
      const copy = element("div");
      copy.append(element("strong", "", room.gameTitle), element("small", "", `Room ${room.code} · ${room.playerCount} players · ${room.spectatorCount || 0} watching`));
      row.append(copy, element("b", "", room.started ? "LIVE" : "LOBBY"));
      overview.appendChild(row);
    });

    state.rooms.forEach((room) => {
      const card = element("article", "room-card");
      const header = element("header");
      const title = element("div");
      title.append(element("h3", "", room.gameTitle), element("p", "", `Room ${room.code} · ${room.matchMode || "casual"}`));
      header.append(title, element("span", "room-state", room.started ? "LIVE" : "LOBBY"));
      const players = element("div", "room-players");
      (room.humanPlayers || []).slice(0, 8).forEach((name) => players.appendChild(element("span", "", name)));
      if (room.aiCount) players.appendChild(element("span", "", `${room.aiCount} AI`));
      const footer = element("div", "room-footer");
      footer.append(element("span", "", `${room.playerCount}/${room.maximumPlayers} seats · ${room.spectatorCount || 0} spectators`), element("span", "", roomDuration(room)));
      card.append(header, players, footer);
      grid.appendChild(card);
    });
  }

  function renderPlayers() {
    const grid = $("playerGrid");
    clear(grid);
    const accounts = state.snapshot?.accounts || [];
    const online = new Set(state.snapshot?.onlineAccountIds || []);
    if (!accounts.length) {
      grid.appendChild(element("div", "empty-state", "No account data available."));
      return;
    }
    accounts
      .slice()
      .sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)) || a.displayName.localeCompare(b.displayName))
      .forEach((player) => {
        const card = element("article", "player-card");
        const avatar = element("span", "player-avatar");
        renderAvatar(avatar, player);
        const copy = element("div");
        copy.append(element("strong", "", player.displayName), element("small", "", `@${player.username} · ${player.role}`));
        card.append(avatar, copy);
        if (online.has(player.id)) card.appendChild(element("span", "online-dot"));
        grid.appendChild(card);
      });
  }

  function renderPersonalStats() {
    const container = $("personalStats");
    const recent = $("recentResults");
    clear(container);
    clear(recent);
    const stats = state.stats;
    if (!stats) {
      container.appendChild(element("div", "empty-state", "Personal game statistics are unavailable."));
      recent.appendChild(element("div", "empty-state", "No recent results loaded."));
      return;
    }
    const grid = element("div", "personal-stat-grid");
    [
      ["Played", stats.played ?? 0],
      ["Won", stats.wins ?? 0],
      ["Win rate", `${Math.round(Number(stats.winRate) || 0)}%`],
    ].forEach(([label, value]) => {
      const card = element("article");
      card.append(element("small", "", label), element("strong", "", String(value)));
      grid.appendChild(card);
    });
    container.appendChild(grid);

    const rows = Array.isArray(stats.recent) ? stats.recent.slice(0, 12) : [];
    if (!rows.length) {
      recent.appendChild(element("div", "empty-state", "No recent verified games yet."));
      return;
    }
    rows.forEach((item) => {
      const row = element("div", "recent-result");
      const copy = element("div");
      copy.append(element("strong", "", item.gameTitle || item.game || "HGR game"), element("small", "", `${formatWhen(item.at)} · Room ${item.roomCode || "—"}`));
      const result = element("b", item.won ? "is-win" : "", item.result || (item.won ? "Win" : "Played"));
      row.append(copy, result);
      recent.appendChild(row);
    });
  }

  function renderAudit() {
    const list = $("auditList");
    clear(list);
    const entries = state.snapshot?.audit || [];
    if (!entries.length) {
      list.appendChild(element("div", "empty-state", "No administrative audit entries loaded."));
      return;
    }
    entries.slice(0, 80).forEach((entry) => {
      const row = element("article", "audit-entry");
      row.appendChild(element("time", "", formatWhen(entry.at)));
      const copy = element("div");
      copy.append(element("strong", "", entry.action || "Administrative action"), element("small", "", entry.summary || "No summary."));
      row.appendChild(copy);
      list.appendChild(row);
    });
  }

  function updateMetrics() {
    const onlineCount = state.snapshot?.onlineAccountIds?.length ?? 0;
    const roomCount = state.rooms.length;
    const clients = Number(state.health?.connectedClients) || 0;
    const spectators = state.rooms.reduce((sum, room) => sum + (Number(room.spectatorCount) || 0), 0);
    const uptime = formatUptime(state.health?.uptimeSeconds);

    $("metricPlayers").textContent = String(onlineCount);
    $("metricRooms").textContent = String(roomCount);
    $("metricClients").textContent = String(clients);
    $("metricSpectators").textContent = String(spectators);
    $("metricUptime").textContent = uptime;
    $("perfClients").textContent = String(clients);
    $("perfPlayers").textContent = String(onlineCount);
    $("perfRooms").textContent = String(roomCount);
    $("perfUptime").textContent = uptime;
    $("serverVersion").textContent = `Version ${state.health?.version || "—"}`;
    $("serverBadge").textContent = state.health?.status === "online" ? "Online" : "Checking";

    const sample = { clients, players: onlineCount, rooms: roomCount };
    const last = state.samples[state.samples.length - 1];
    if (!last || last.clients !== sample.clients || last.players !== sample.players || last.rooms !== sample.rooms || Date.now() - last.at > 1800) {
      state.samples.push({ ...sample, at: Date.now() });
      if (state.samples.length > 31) state.samples.shift();
    }
    drawCharts();
  }

  function svgNode(name, attrs = {}) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function renderChart(svg, width, height) {
    if (!svg) return;
    clear(svg);
    const pad = 16;
    for (let index = 0; index <= 4; index += 1) {
      const y = pad + ((height - pad * 2) / 4) * index;
      svg.appendChild(svgNode("line", { x1: pad, y1: y, x2: width - pad, y2: y, class: "chart-grid" }));
    }
    const samples = state.samples.length ? state.samples : [{ clients: 0, players: 0, rooms: 0, at: Date.now() }];
    const maximum = Math.max(4, ...samples.flatMap((sample) => [sample.clients, sample.players, sample.rooms]));
    const point = (value, index) => {
      const x = samples.length === 1 ? pad : pad + ((width - pad * 2) * index) / (samples.length - 1);
      const y = height - pad - ((height - pad * 2) * Number(value || 0)) / maximum;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };
    [
      ["clients", "chart-line-a"],
      ["players", "chart-line-b"],
      ["rooms", "chart-line-c"],
    ].forEach(([key, className]) => {
      const points = samples.map((sample, index) => point(sample[key], index)).join(" ");
      svg.appendChild(svgNode("polyline", { points, class: className }));
    });
  }

  function drawCharts() {
    renderChart($("activityChart"), 720, 220);
    renderChart($("performanceChart"), 960, 280);
  }

  function renderAll() {
    renderIdentity();
    renderNowPlaying();
    renderRooms();
    renderPlayers();
    renderPersonalStats();
    renderAudit();
    updateMetrics();
  }

  async function refreshCore() {
    const [snapshotResult, roomsResult, statsResult, healthResult] = await Promise.allSettled([
      api("/admin/snapshot"),
      api("/accounts/live-games"),
      api("/accounts/me/stats"),
      api("/health"),
    ]);
    if (snapshotResult.status === "fulfilled") state.snapshot = snapshotResult.value;
    if (roomsResult.status === "fulfilled") state.rooms = roomsResult.value.rooms || [];
    if (statsResult.status === "fulfilled") state.stats = statsResult.value.stats || null;
    if (healthResult.status === "fulfilled") state.health = healthResult.value;
    $("cloudState").classList.toggle("is-live", healthResult.status === "fulfilled");
    $("cloudState").querySelector("b").textContent = healthResult.status === "fulfilled" ? "HGR Cloud connected" : "HGR Cloud unavailable";
    $("cloudDetail").textContent = healthResult.status === "fulfilled" ? "Authenticated admin session" : "Unable to reach server";
    $("cloudBadge").textContent = healthResult.status === "fulfilled" ? "Online" : "Offline";
    renderAll();
  }

  async function refreshHealthOnly() {
    try {
      state.health = await api("/health");
      const roomsResult = await api("/accounts/live-games");
      state.rooms = roomsResult.rooms || [];
      updateMetrics();
      renderNowPlaying();
      renderRooms();
      $("cloudState").classList.add("is-live");
      $("cloudState").querySelector("b").textContent = "HGR Cloud connected";
    } catch {
      $("cloudState").classList.remove("is-live");
      $("cloudState").querySelector("b").textContent = "HGR Cloud unavailable";
    }
  }

  function normaliseOperation(value) {
    if (!value || typeof value !== "object") return null;
    const progress = Math.max(0, Math.min(100, Number(value.progress) || 0));
    const stateValue = ["running", "succeeded", "failed", "rejected"].includes(value.state) ? value.state : "running";
    return {
      id: String(value.id || "operation"),
      action: String(value.action || "update"),
      title: String(value.title || (value.action === "update" ? "Updating HGR" : "HGR operation")),
      phase: String(value.phase || "Working…"),
      progress,
      state: stateValue,
      startedAt: value.startedAt || null,
      updatedAt: value.updatedAt || null,
    };
  }

  function operationToastIsMobile() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function setOperationToastCorner(value, persist = true) {
    const toast = $("operationToast");
    if (!toast) return;
    const corner = OPERATION_TOAST_CORNERS.has(value) ? value : "bottom-right";
    toast.dataset.corner = corner;
    for (const property of ["left", "right", "top", "bottom", "transform"]) toast.style.removeProperty(property);
    if (persist) {
      try { localStorage.setItem(OPERATION_TOAST_CORNER_KEY, corner); } catch { /* Storage is optional. */ }
    }
  }

  function setOperationToastMinimized(value, persist = true) {
    const toast = $("operationToast");
    if (!toast) return;
    const minimized = Boolean(value) && operationToastIsMobile();
    toast.classList.toggle("is-minimized", minimized);
    const minimize = $("operationToastMinimize");
    if (minimize) minimize.hidden = minimized;
    if (!minimized) {
      for (const property of ["left", "right", "top", "bottom", "transform"]) toast.style.removeProperty(property);
    }
    if (persist) {
      try { localStorage.setItem(OPERATION_TOAST_MINIMIZED_KEY, minimized ? "1" : "0"); } catch { /* Storage is optional. */ }
    }
  }

  function restoreOperationToastLayout() {
    let minimized = false;
    let corner = "bottom-right";
    try {
      minimized = localStorage.getItem(OPERATION_TOAST_MINIMIZED_KEY) === "1";
      const savedCorner = localStorage.getItem(OPERATION_TOAST_CORNER_KEY);
      if (savedCorner && OPERATION_TOAST_CORNERS.has(savedCorner)) corner = savedCorner;
    } catch { /* Storage is optional. */ }
    setOperationToastCorner(corner, false);
    setOperationToastMinimized(minimized, false);
  }

  function bindOperationToastDrag() {
    const toast = $("operationToast");
    const summary = $("operationToastToggle");
    if (!toast || !summary) return;
    let drag = null;

    summary.addEventListener("pointerdown", (event) => {
      if (!toast.classList.contains("is-minimized")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const rect = toast.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      summary.setPointerCapture?.(event.pointerId);
    });

    summary.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
      if (!drag.moved) return;
      const rect = toast.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, event.clientX - drag.offsetX));
      const top = Math.max(8, Math.min(window.innerHeight - rect.height - 92, event.clientY - drag.offsetY));
      toast.style.left = `${left}px`;
      toast.style.top = `${top}px`;
      toast.style.right = "auto";
      toast.style.bottom = "auto";
      toast.style.transform = "none";
    });

    const finishDrag = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const moved = drag.moved;
      drag = null;
      summary.releasePointerCapture?.(event.pointerId);
      if (!moved) return;
      operationToastClickSuppressedUntil = Date.now() + 350;
      const rect = toast.getBoundingClientRect();
      const vertical = rect.top + rect.height / 2 < window.innerHeight / 2 ? "top" : "bottom";
      const horizontal = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
      setOperationToastCorner(`${vertical}-${horizontal}`);
    };
    summary.addEventListener("pointerup", finishDrag);
    summary.addEventListener("pointercancel", finishDrag);
  }

  function setOperation(value) {
    const operation = normaliseOperation(value);
    state.activeOperation = operation;
    if (!operation) {
      $("operationToast").hidden = true;
      return;
    }
    $("operationToast").hidden = false;
    $("operationToast").dataset.state = operation.state;
    $("operationTitle").textContent = operation.state === "succeeded" ? "Update complete" : operation.state === "failed" ? "Update failed" : operation.state === "rejected" ? "Update not started" : operation.title;
    $("operationPhase").textContent = operation.phase;
    $("operationPercent").textContent = `${Math.round(operation.progress)}%`;
    $("operationProgressBar").style.width = `${operation.progress}%`;
    $("operationDetailAction").textContent = operation.title;
    $("operationStarted").textContent = operation.startedAt ? formatWhen(operation.startedAt) : "Unavailable";
    $("operationUpdated").textContent = operation.updatedAt ? `Last update: ${formatWhen(operation.updatedAt)}` : "Awaiting progress timestamp";
    $("operationUpdated").dateTime = operation.updatedAt || "";
    $("operationState").textContent = operation.state[0].toUpperCase() + operation.state.slice(1);
    $("operationDismiss").hidden = operation.state === "running";
  }

  function bindOperationChannels() {
    window.addEventListener("hgr-control-operation", (event) => setOperation(event.detail));
    try {
      const channel = new BroadcastChannel("hgr-control-operations");
      channel.addEventListener("message", (event) => setOperation(event.data));
    } catch { /* BroadcastChannel is optional. */ }

    window.addEventListener("load", () => {
      if (typeof window.io !== "function") return;
      try {
        const socket = window.io({ withCredentials: true });
        socket.on("control:operation", setOperation);
      } catch { /* Future cloud relay event; safe to ignore for Batch 1. */ }
    });
  }

  function bindUi() {
    queryAll("[data-section]").forEach((button) => button.addEventListener("click", () => setSection(button.dataset.section)));
    queryAll("[data-jump]").forEach((button) => button.addEventListener("click", () => setSection(button.dataset.jump)));
    $("refreshLive")?.addEventListener("click", () => void refreshCore());
    $("refreshAudit")?.addEventListener("click", () => void refreshCore());
    restoreOperationToastLayout();
    bindOperationToastDrag();
    $("operationToastToggle")?.addEventListener("click", () => {
      if (Date.now() < operationToastClickSuppressedUntil) return;
      const toast = $("operationToast");
      if (toast.classList.contains("is-minimized")) {
        setOperationToastMinimized(false);
        return;
      }
      const details = $("operationDetails");
      details.hidden = !details.hidden;
      $("operationToastToggle").setAttribute("aria-expanded", String(!details.hidden));
    });
    $("operationToastMinimize")?.addEventListener("click", () => {
      const details = $("operationDetails");
      details.hidden = true;
      $("operationToastToggle").setAttribute("aria-expanded", "false");
      setOperationToastMinimized(true);
    });
    window.addEventListener("resize", restoreOperationToastLayout);
    $("operationDismiss")?.addEventListener("click", () => {
      if (state.activeOperation?.state !== "running") setOperation(null);
    });
  }

  async function initialise() {
    bindUi();
    bindOperationChannels();
    showAccess("Checking administrative access…", "Control uses your normal Halieus account. Owner or administrator access is required.");
    try {
      const auth = await api("/auth/status");
      if (!auth?.authenticated || !auth.account) {
        showAccess("Sign in to use HGR Control", "Open Halieus Game Room and sign into an owner or administrator account first.");
        return;
      }
      if (auth.account.role !== "owner" && auth.account.role !== "admin") {
        showAccess("Administrator access required", "This Halieus account can play games, but it does not have permission to open HGR Control.");
        return;
      }
      state.account = auth.account;
      hideAccess();
      renderIdentity();
      await refreshCore();
      window.setInterval(() => void refreshHealthOnly(), 2000);
      window.setInterval(() => void refreshCore(), 10000);
    } catch (error) {
      showAccess("HGR Control is unavailable", error instanceof Error ? error.message : "Unable to verify your Halieus account.");
    }
  }

  void initialise();
})();
