import { useEffect, useState } from "react";

interface RoomTimeMetaProps {
  createdAt: number;
  startedAt?: number | null;
  started?: boolean;
  className?: string;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

/** Shared match clock. Room age is deliberately not used as match duration. */
export function RoomTimeMeta({ createdAt: _createdAt, startedAt, started = true, className = "" }: RoomTimeMetaProps) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const duration = started && startedAt ? now - startedAt : 0;
  const clock = new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const sharedClassName = `${className} room-time-meta`.trim();
  return (
    <>
      <span className={`${sharedClassName} room-time-meta-duration room-match-duration`}>Duration <strong>{formatDuration(duration)}</strong></span>
      <span className={`${sharedClassName} room-time-meta-clock room-wall-clock`}>Time <strong>{clock}</strong></span>
    </>
  );
}
