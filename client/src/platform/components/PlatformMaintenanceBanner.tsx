import { useEffect, useRef, useState } from "react";
import type {
  HalieusMaintenanceNotice,
  HalieusServerReadyPayload,
} from "../../../../shared/platform/maintenance";
import { RELEASE_FINGERPRINT } from "../../version";
import { socket } from "../network/sockets";
import "./PlatformMaintenanceBanner.css";

type BannerMode = "maintenance" | "reloading";

export function PlatformMaintenanceBanner() {
  const [notice, setNotice] = useState<HalieusMaintenanceNotice | null>(null);
  const [mode, setMode] = useState<BannerMode>("maintenance");
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const reloadTimer = useRef<number | null>(null);

  useEffect(() => {
    const onMaintenance = (incoming: HalieusMaintenanceNotice) => {
      if (!incoming?.id || !incoming?.state || !incoming?.reason) return;
      setMode("maintenance");
      setNotice(incoming);
    };

    const onMaintenanceCleared = () => {
      if (mode !== "reloading") setNotice(null);
    };

    const onServerReady = (ready: HalieusServerReadyPayload) => {
      if (!ready?.releaseFingerprint) return;

      if (ready.releaseFingerprint !== RELEASE_FINGERPRINT) {
        const now = Date.now();
        setMode("reloading");
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
        reloadTimer.current = window.setTimeout(() => {
          window.location.reload();
        }, 1200);
        return;
      }

      if (mode === "maintenance") {
        setNotice((current) => current?.state === "restarting" ? null : current);
      }
    };

    const onDisconnect = () => {
      setNotice((current) => {
        if (!current) return current;
        return {
          ...current,
          state: "restarting",
          restartAt: Date.now(),
          estimatedSeconds: 10,
        };
      });
    };

    socket.on("platform:maintenance", onMaintenance);
    socket.on("platform:maintenance-cleared", onMaintenanceCleared);
    socket.on("server:ready", onServerReady);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("platform:maintenance", onMaintenance);
      socket.off("platform:maintenance-cleared", onMaintenanceCleared);
      socket.off("server:ready", onServerReady);
      socket.off("disconnect", onDisconnect);
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    };
  }, [mode]);

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
  const isRestarting = notice.state === "restarting";
  const status = isReloading
    ? "UPDATE COMPLETE"
    : isRestarting
      ? "SERVER RESTARTING"
      : "UPDATE INCOMING";

  const timing = isReloading
    ? "Refreshing this tab…"
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
        {!isReloading && (
          <p>
            If you are in a live game, keep your recovery key or room code handy.
            Your browser will reconnect and load the new release when it is ready.
          </p>
        )}
      </div>
      <b className="halieus-maintenance-timing">{timing}</b>
    </aside>
  );
}
