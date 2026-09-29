import { useEffect, useRef, useState } from "react";
import type {
  HalieusMaintenanceNotice,
  HalieusServerReadyPayload,
} from "../../../../shared/platform/maintenance";
import { RELEASE_FINGERPRINT } from "../../version";
import { serverUrl, socket } from "../network/sockets";
import "./PlatformMaintenanceBanner.css";

type BannerMode = "maintenance" | "reloading" | "refresh-required";

const RELEASE_REFRESH_TARGET_KEY = "halieus-release-refresh-target";
const RELEASE_POLL_MS = 1000;

function releaseNavigationUrl(ready: HalieusServerReadyPayload): string {
  const url = new URL(window.location.href);
  url.searchParams.set("build", ready.version || "current");
  url.searchParams.set("release", ready.releaseFingerprint.slice(0, 16));
  url.searchParams.set("refresh", String(Date.now()));
  return url.toString();
}

async function readServerIdentity(): Promise<HalieusServerReadyPayload | null> {
  try {
    const url = new URL("/health", serverUrl);
    url.searchParams.set("refresh", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "include",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;

    const body = await response.json() as {
      version?: unknown;
      releaseFingerprint?: unknown;
    };
    if (
      typeof body.version !== "string" ||
      typeof body.releaseFingerprint !== "string" ||
      !body.releaseFingerprint
    ) {
      return null;
    }

    return {
      message: "Release identity read from /health",
      version: body.version,
      releaseFingerprint: body.releaseFingerprint,
    };
  } catch {
    return null;
  }
}

function prepareForReleaseNavigation(ready: HalieusServerReadyPayload): void {
  try {
    navigator.serviceWorker?.controller?.postMessage({
      type: "HALIEUS_RELEASE_REFRESH",
      releaseFingerprint: ready.releaseFingerprint,
    });
    void navigator.serviceWorker?.getRegistrations?.().then((registrations) =>
      Promise.allSettled(registrations.map((registration) => registration.update())),
    );
  } catch {
    // Cache-busted top-level navigation remains authoritative.
  }
}

export function PlatformMaintenanceBanner() {
  const [notice, setNotice] = useState<HalieusMaintenanceNotice | null>(null);
  const [mode, setMode] = useState<BannerMode>("maintenance");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<HalieusServerReadyPayload | null>(null);
  const reloadTimer = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const maintenanceSeen = useRef(false);

  function navigateToRelease(ready: HalieusServerReadyPayload): void {
    prepareForReleaseNavigation(ready);
    window.location.replace(releaseNavigationUrl(ready));
  }

  useEffect(() => {
    let disposed = false;

    const stopPoll = () => {
      if (pollTimer.current) {
        window.clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }
    };

    const scheduleRefresh = (ready: HalieusServerReadyPayload) => {
      if (ready.releaseFingerprint === RELEASE_FINGERPRINT) {
        sessionStorage.removeItem(RELEASE_REFRESH_TARGET_KEY);
        setMode("maintenance");
        setReleaseTarget(null);
        setNotice((current) => current?.state === "restarting" ? null : current);
        return;
      }

      maintenanceSeen.current = true;
      sessionStorage.setItem(RELEASE_REFRESH_TARGET_KEY, ready.releaseFingerprint);
      setReleaseTarget(ready);
      setMode("reloading");

      const now = Date.now();
      setNotice({
        id: `release-${ready.releaseFingerprint}`,
        state: "restarting",
        reason: `HGR ${ready.version || "update"} is online. Loading the new release in this tab…`,
        targetVersion: ready.version || null,
        announcedAt: now,
        restartAt: now,
        estimatedSeconds: 1,
      });

      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      reloadTimer.current = window.setTimeout(() => {
        navigateToRelease(ready);
      }, 850);
      fallbackTimer.current = window.setTimeout(() => {
        setMode("refresh-required");
      }, 4500);
    };

    const pollForRelease = async () => {
      stopPoll();
      if (disposed || !maintenanceSeen.current) return;

      const ready = await readServerIdentity();
      if (disposed) return;

      if (ready?.releaseFingerprint && ready.releaseFingerprint !== RELEASE_FINGERPRINT) {
        scheduleRefresh(ready);
        return;
      }

      pollTimer.current = window.setTimeout(() => {
        void pollForRelease();
      }, RELEASE_POLL_MS);
    };

    const onMaintenance = (incoming: HalieusMaintenanceNotice) => {
      if (!incoming?.id || !incoming?.state || !incoming?.reason) return;
      maintenanceSeen.current = true;
      setMode("maintenance");
      setNotice(incoming);
      void pollForRelease();
    };

    const onMaintenanceCleared = () => {
      setNotice((current) => current?.state === "restarting" ? current : null);
    };

    const onServerReady = (ready: HalieusServerReadyPayload) => {
      if (!ready?.releaseFingerprint) return;
      if (ready.releaseFingerprint !== RELEASE_FINGERPRINT) {
        scheduleRefresh(ready);
        return;
      }

      sessionStorage.removeItem(RELEASE_REFRESH_TARGET_KEY);
      setMode("maintenance");
      setReleaseTarget(null);
      setNotice((current) => current?.state === "restarting" ? null : current);
    };

    const onDisconnect = () => {
      if (!maintenanceSeen.current) return;
      setNotice((current) => {
        if (!current) return current;
        return {
          ...current,
          state: "restarting",
          restartAt: Date.now(),
          estimatedSeconds: 10,
        };
      });
      void pollForRelease();
    };

    socket.on("platform:maintenance", onMaintenance);
    socket.on("platform:maintenance-cleared", onMaintenanceCleared);
    socket.on("server:ready", onServerReady);
    socket.on("disconnect", onDisconnect);

    const pendingFingerprint = sessionStorage.getItem(RELEASE_REFRESH_TARGET_KEY);
    if (pendingFingerprint && pendingFingerprint !== RELEASE_FINGERPRINT) {
      maintenanceSeen.current = true;
      void pollForRelease();
    }

    return () => {
      disposed = true;
      stopPoll();
      socket.off("platform:maintenance", onMaintenance);
      socket.off("platform:maintenance-cleared", onMaintenanceCleared);
      socket.off("server:ready", onServerReady);
      socket.off("disconnect", onDisconnect);
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!notice?.restartAt || notice.state === "restarting") {
      setSecondsRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((notice.restartAt! - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 500);
    return () => window.clearInterval(timer);
  }, [notice]);

  if (!notice) return null;

  const isReloading = mode === "reloading";
  const isRefreshRequired = mode === "refresh-required";
  const isRestarting = notice.state === "restarting";
  const status = isReloading
    ? "UPDATE COMPLETE"
    : isRefreshRequired
      ? "NEW RELEASE READY"
      : isRestarting
        ? "SERVER RESTARTING"
        : "UPDATE INCOMING";

  const timing = isReloading
    ? "Loading new release…"
    : isRefreshRequired
      ? "Tap to refresh"
      : isRestarting
        ? "Reconnecting automatically…"
        : secondsRemaining != null
          ? `Restart in ~${secondsRemaining}s`
          : "Restart shortly";

  return (
    <aside
      className={`halieus-maintenance-banner ${isRestarting || isReloading ? "is-restarting" : "is-scheduled"}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="halieus-maintenance-icon" aria-hidden="true">
        {isReloading ? "✓" : isRestarting ? "↻" : "↑"}
      </span>
      <div className="halieus-maintenance-copy">
        <small>{status}{notice.targetVersion ? ` · HGR ${notice.targetVersion}` : ""}</small>
        <strong>{notice.reason}</strong>
        {!isReloading && !isRefreshRequired && (
          <p>
            If you are in a live game, keep your recovery key or room code handy.
            Your browser will reconnect and load the new release when it is ready.
          </p>
        )}
      </div>
      {releaseTarget && isRefreshRequired ? (
        <button
          type="button"
          className="halieus-maintenance-refresh"
          onClick={() => navigateToRelease(releaseTarget)}
        >
          Refresh now
        </button>
      ) : (
        <b className="halieus-maintenance-timing">{timing}</b>
      )}
    </aside>
  );
}
