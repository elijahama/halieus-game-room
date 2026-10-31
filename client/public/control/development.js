(() => {
  "use strict";
  // Read-only: GitHub records are evidence of submitted development, not an
  // assertion that an AI assistant or local test is currently executing.
  const $ = (id) => document.getElementById(id);
  // The ordered delivery plan is editorial. PR/CI states below are read
  // from GitHub independently, never invented from a checklist or timer.
  const DELIVERY_BATCHES = [
    {
      id: "A", title: "Update failure diagnostics",
      plan: "Release source merged", pr: 190,
      gate: "Oracle health failures show a clear safety-stop reason; no restart when occupancy cannot be verified. Source merged; live installation remains a separate gate.",
    },
    {
      id: "B", title: "Real progress bar inside Update notifications",
      plan: "Submitted for review", pr: 187,
      gate: "Visible bar in expanded/minimised Control notifications, driven only by server-reported percentage; mobile acceptance and actual release verification.",
    },
    {
      id: "C", title: "Android status-bar notification identity",
      plan: "Submitted for review", pr: 188,
      gate: "Approved main H, Control H/cog and Mega Board M badges; installed Android PWA notification check; no new launcher artwork.",
    },
    {
      id: "D", title: "Live-game continuity and push reliability",
      plan: "Planned · gameplay safety", issue: 115,
      gate: "Background/foreground return cannot softlock a match; join/rejoin and required-decision alerts work in real games, including Android device acceptance.",
    },
    {
      id: "E", title: "Mobile Owner Settings and flat Join control",
      plan: "Planned · interface repair",
      gate: "Profile/Owner Settings redesigned and tested at phone/tablet widths; Join loses all gloss, emboss and unwanted physical-button shadows.",
    },
    {
      id: "F", title: "Owner sign-in review and blocking controls",
      plan: "Planned · security", issue: 186,
      gate: "Owner-only rejected sign-in audit, verified source IP, safe account/IP bans and unban/recovery; no claim of hardware MAC address access.",
    },
    {
      id: "G", title: "Scheduled software releases",
      plan: "Planned · separate from maintenance", issue: 182,
      gate: "Exact release window, explicit version approval, game-drain preflight, health and rollback receipts; never run an unapproved update.",
    },
    {
      id: "H", title: "Mobile gameplay, saves and replay acceptance",
      plan: "Planned · cross-game quality", issue: 153,
      gate: "Validate Mega Board mobile decisions, live room recovery, finished-match history and game-specific privacy-safe replay adapters in separate audits.",
    },
  ];

  const TOURNAMENT_ROADMAP = [
    {
      version: "4.6.x", stage: "Foundation carried forward",
      status: "Foundation source exists; full replay coverage not established",
      gate: "Independent tournament rating/fixture identity and HGR-wide replay/archive primitives, with no claim that all fourteen game adapters are finished.",
    },
    {
      version: "4.7.x", stage: "Playable Guild fixtures",
      status: "Current release line · owner acceptance still required",
      gate: "Two independent real Mega Board games per Guild-v-Guild fixture, locked lineups, unchanged rent, immutable results, reconnection, ties and settlement.",
    },
    {
      version: "4.8.x", stage: "Solo and Guild bracket formats",
      status: "Planned milestone",
      gate: "Real entrants, seeded fixtures, winners/losers bracket advancement, elimination/finals policy, room links, spectating and recovery.",
    },
    {
      version: "4.9.x", stage: "Competitive polish and launch readiness",
      status: "Planned milestone",
      gate: "Separate tournament player/Guild ratings, scoring and standings, seasons if approved, reports, tournament match replay, mobile UX, abuse controls and release rehearsals.",
    },
    {
      version: "5.0.0", stage: "Complete Mega Board Tournament Mode",
      status: "Reserved · not released",
      gate: "Run both Solo and Guild tournaments end-to-end on production: registration, boards, results, brackets, finals, fair recovery, downloadable replay and explicit owner sign-off.",
    },
  ];

  function renderDeliveryPlan(pulls = [], pullsAvailable = false) {
    const container = $("developmentDeliveryBatches");
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    for (const batch of DELIVERY_BATCHES) {
      const item = document.createElement("li");
      item.className = "development-delivery-item";
      const heading = document.createElement("div");
      heading.className = "development-delivery-heading";
      const number = text("span", batch.id, "development-batch-id");
      const title = text("strong", batch.title);
      heading.append(number, title);
      item.appendChild(heading);
      let stateLabel = batch.plan;
      if (batch.pr && pullsAvailable) {
        const evidence = pulls.find(pull => Number(pull.number) === batch.pr);
        if (evidence) stateLabel = pullState(evidence);
        else stateLabel = "Status not in latest GitHub snapshot · verify PR";
      }
      item.appendChild(text("small", stateLabel, "development-batch-state"));
      item.appendChild(text("p", batch.gate));
      const numberSource = batch.pr || batch.issue;
      if (numberSource) {
        const source = text("a", batch.pr ? "Review change on GitHub" : "View requirements on GitHub", "development-source-link");
        source.href = "https://github.com/elijahama/halieus-game-room/" +
          (batch.pr ? "pull/" : "issues/") + numberSource;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        item.appendChild(source);
      }
      container.appendChild(item);
    }
  }

  function renderTournamentRoadmap() {
    const container = $("developmentTournamentRoadmap");
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    for (const milestone of TOURNAMENT_ROADMAP) {
      const item = document.createElement("article");
      item.className = "development-roadmap-item";
      const header = document.createElement("div");
      header.className = "development-roadmap-heading";
      header.append(text("strong", milestone.version), text("span", milestone.stage));
      item.appendChild(header);
      item.appendChild(text("small", milestone.status, "development-roadmap-state"));
      item.appendChild(text("p", milestone.gate));
      container.appendChild(item);
    }
  }

  const panel = document.querySelector('[data-panel="development"]');
  if (!panel) return;
  let inFlight = null;
  const active = () => panel.classList.contains("is-active");
  const when = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "Time unavailable";
  };
  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = String(value ?? "");
    return node;
  };
  const clear = (node) => { while (node?.firstChild) node.removeChild(node.firstChild); };
  const empty = (node, copy) => node.appendChild(text("p", copy, "empty-state"));
  const pullState = (item) => ({
    draft: "Draft · awaiting review",
    open: "Open · awaiting review",
    merged: "Merged · changes accepted",
    closed: "Closed · not merged",
  })[item.state] || "Status unavailable";
  const runState = (run) => {
    if (run.status === "queued" || run.status === "waiting" || run.status === "pending") return "Queued";
    if (run.status === "in_progress") return "Running";
    if (run.status !== "completed") return "Status unavailable";
    return ({
      success: "Passed",
      failure: "Failed",
      cancelled: "Cancelled",
      skipped: "Skipped",
      timed_out: "Timed out",
      action_required: "Action required",
      neutral: "Completed",
    })[run.conclusion] || "Completed · result unavailable";
  };
  function entry(node, label, info, detail, href, kind) {
    const row = document.createElement("div");
    row.className = "development-entry";
    const copy = document.createElement("div");
    copy.className = "development-entry-copy";
    copy.append(text("strong", label), text("small", info, "development-state"),
      text("small", detail, "development-detail"));
    row.appendChild(copy);
    if (href) {
      const link = text("a", "View on GitHub", "development-source-link");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `View ${kind} on GitHub`);
      row.appendChild(link);
    }
    node.appendChild(row);
  }
  function render(data) {
    const pullsNode = $("developmentPulls");
    const runsNode = $("developmentRuns");
    clear(pullsNode);
    clear(runsNode);
    const pulls = Array.isArray(data.pulls) ? data.pulls : [];
    renderDeliveryPlan(pulls, Boolean(data.pullsAvailable));
    const runs = Array.isArray(data.runs) ? data.runs : [];
    const open = pulls.filter(pull => pull.state === "open" || pull.state === "draft");
    const recent = pulls.filter(pull => pull.state === "merged" || pull.state === "closed").slice(0, 5);
    const running = runs.filter(run => run.status === "in_progress").length;
    if (!data.pullsAvailable) empty(pullsNode, "GitHub pull requests are unavailable. No queue status can be confirmed.");
    else if (!open.length && !recent.length) empty(pullsNode, "No pull requests in the available GitHub window.");
    else {
      if (!open.length) empty(pullsNode, "No open pull requests in the available GitHub window.");
      for (const item of [...open.slice(0, 15), ...recent]) {
        const number = Number(item.number);
        if (!Number.isSafeInteger(number) || number <= 0) continue;
        entry(pullsNode, `#${number} · ${String(item.title || "Untitled change")}`,
          pullState(item), `${String(item.branch || "Branch unavailable")} · ${when(item.updatedAt)}`,
          `https://github.com/elijahama/halieus-game-room/pull/${number}`, `pull request #${number}`);
      }
    }
    if (!data.runsAvailable) empty(runsNode, "GitHub Actions are unavailable; check status is unconfirmed.");
    else if (!runs.length) empty(runsNode, "No GitHub Actions runs returned. This does not mean local tests passed.");
    else for (const run of runs.slice(0, 12)) {
      const id = Number(run.id);
      if (!Number.isSafeInteger(id) || id <= 0) continue;
      entry(runsNode, String(run.name || "GitHub workflow"), runState(run),
        `${String(run.branch || "Branch unavailable")} · ${when(run.updatedAt)}`,
        `https://github.com/elijahama/halieus-game-room/actions/runs/${id}`, `workflow run ${id}`);
    }
    const pullCount = data.pullsAvailable ? `${open.length} open/draft pull requests` : "PR status unavailable";
    const runCount = data.runsAvailable ? `${running} running GitHub workflows` : "workflow status unavailable";
    $("developmentSummary").textContent = `${pullCount} · ${runCount}`;
    $("developmentTimestamp").textContent = `${data.stale ? "Stale last successful snapshot" : "GitHub snapshot"} · ${when(data.fetchedAt)} · server caches for up to five minutes`;
  }
  async function refresh() {
    if (inFlight) return inFlight;
    const button = $("refreshDevelopment");
    button.disabled = true;
    $("developmentSummary").textContent = "Checking GitHub development status…";
    inFlight = (async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 11000);
      try {
        const response = await fetch("/control/development-status", {
          cache: "no-store", credentials: "include", headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Development status could not be retrieved.");
        const result = await response.json();
        if (!result.ok) throw new Error("Development status unavailable.");
        render(result);
      } catch {
        $("developmentSummary").textContent = "Development status unavailable";
        $("developmentTimestamp").textContent = "Could not verify GitHub activity. Use Refresh to retry.";
        clear($("developmentPulls"));
        clear($("developmentRuns"));
        empty($("developmentPulls"), "GitHub status could not be confirmed. Previously shown activity is not a live indication.");
        empty($("developmentRuns"), "No workflow result can be confirmed.");
      } finally {
        window.clearTimeout(timer);
      }
    })().finally(() => { inFlight = null; button.disabled = false; });
    return inFlight;
  }
  renderDeliveryPlan();
  renderTournamentRoadmap();
  $("refreshDevelopment")?.addEventListener("click", () => { void refresh(); });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element
      && event.target.closest('[data-section="development"],[data-jump="development"]'))
      window.setTimeout(() => { if (active()) void refresh(); }, 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && active()) void refresh();
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible" && active()) void refresh();
  }, 120_000);
})();
/* Owner-only local evidence panel. Independent from GitHub snapshots and Update. */
(() => {
  "use strict";
  const panel = document.querySelector('[data-panel="development"]');
  const state = document.getElementById("developmentLocalState");
  const hint = document.getElementById("developmentLocalHint");
  const list = document.getElementById("developmentLocalEntries");
  if (!panel || !state || !hint || !list) return;
  let request = null;
  const active = () => panel.classList.contains("is-active");
  const when = (value) => {
    const time = new Date(value);
    return Number.isFinite(time.getTime()) ? time.toLocaleString() : "Time unavailable";
  };
  const text = (tag, content, className) => {
    const result = document.createElement(tag);
    if (className) result.className = className;
    result.textContent = String(content ?? "");
    return result;
  };
  const reset = () => {
    while (list.firstChild) list.removeChild(list.firstChild);
  };
  const unavailable = (message) => {
    reset();
    state.textContent = message;
    hint.textContent = "Remote HGR Control cannot directly access your laptop's private OpenShard files. No live task state is inferred.";
    list.appendChild(text("p", "No verified local timeline data is available here.", "empty-state"));
  };
  function render(result) {
    reset();
    const events = Array.isArray(result.events) ? result.events.slice(0, 18) : [];
    if (result.source === "unavailable") {
      unavailable("Local OpenShard source unavailable");
      return;
    }
    state.textContent = result.stale || result.source === "stale"
      ? "Owner-PC timeline stale · laptop sync unavailable"
      : result.transport === "cloud-relay"
        ? (result.source === "partial" ? "Partial owner-PC timeline received" : "Owner-PC timeline received")
        : result.source === "partial"
          ? "Partial local history on this server"
          : "Local history available on this server";
    hint.textContent = "Last recorded: " + (result.latestAt ? when(result.latestAt) : "No recorded events")
      + (result.lastReceivedAt ? " · Last sync: " + when(result.lastReceivedAt) : "")
      + (result.stale ? " · This is stale history, not current laptop activity." : " · Historical evidence, not proof of task completion.");
    if (!events.length) {
      list.appendChild(text("p", "No recent local evidence found. This does not mean a task completed.", "empty-state"));
      return;
    }
    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const row = document.createElement("div");
      row.className = "development-entry development-local-entry";
      const copy = document.createElement("div");
      copy.className = "development-entry-copy";
      const source = event.source === "openshard" ? "OpenShard receipt" : "Bridge record";
      const status = event.status === "verification-passed" ? "Verification passed"
        : event.status === "verification-failed" ? "Verification failed"
        : event.status === "not-verified" ? "Not verified"
        : event.status === "milestone-reported" ? "Milestone reported"
        : event.status === "blocked" ? "Blocked"
        : event.status === "started" ? "Started"
        : event.status === "prompt" ? "Instruction recorded"
        : "Checkpoint recorded";
      copy.appendChild(text("strong", source + " · " + status));
      copy.appendChild(text("small", when(event.at), "development-state"));
      const id = String(event.id || "").slice(0, 160);
      const task = event.taskId ? " · task " + String(event.taskId).slice(0, 128) : "";
      copy.appendChild(text("small", id + task, "development-detail"));
      row.appendChild(copy);
      list.appendChild(row);
    }
  }
  async function refresh() {
    if (request) return request;
    request = (async () => {
      state.textContent = "Checking for local development records…";
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 9000);
      try {
        const response = await fetch("/control/development-timeline", {
          cache: "no-store", credentials: "include",
          headers: { Accept: "application/json" }, signal: controller.signal,
        });
        if (response.status === 403) {
          unavailable("Owner sign-in is required for local evidence");
          return;
        }
        if (!response.ok) throw new Error("Source unavailable");
        const result = await response.json();
        if (!result.ok) throw new Error("Source unavailable");
        render(result);
      } catch {
        unavailable("Local development timeline could not be checked");
      } finally {
        window.clearTimeout(timer);
      }
    })().finally(() => { request = null; });
    return request;
  }
  document.getElementById("refreshDevelopment")?.addEventListener("click", () => { void refresh(); });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest('[data-section="development"],[data-jump="development"]'))
      window.setTimeout(() => { if (active()) void refresh(); }, 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && active()) void refresh();
  });
  window.setInterval(() => {
    if (document.visibilityState === "visible" && active()) void refresh();
  }, 120_000);
})();
