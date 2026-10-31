/**
 * Strict, DST-safe wall-clock conversion for owner-scheduled maintenance.
 * Rejects nonexistent spring-forward times and ambiguous fall-back times
 * rather than silently shifting the requested start or end.
 */
export function resolveMaintenanceWallTime(rawLocal: unknown, rawZone: unknown): number {
  if (typeof rawLocal !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawLocal)) {
    throw new Error("Enter a valid date and time in YYYY-MM-DDTHH:mm format.");
  }
  if (typeof rawZone !== "string" || rawZone.length < 1 || rawZone.length > 80 ||
      !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)*$/.test(rawZone)) {
    throw new Error("Choose an IANA time zone such as Europe/London or America/New_York.");
  }
  const [year, month, day, hour, minute] = [
    Number(rawLocal.slice(0, 4)), Number(rawLocal.slice(5, 7)),
    Number(rawLocal.slice(8, 10)), Number(rawLocal.slice(11, 13)),
    Number(rawLocal.slice(14, 16)),
  ];
  const nominal = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(nominal);
  if (year < 2020 || year > 2100 ||
      check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day || check.getUTCHours() !== hour ||
      check.getUTCMinutes() !== minute) {
    throw new Error("The selected calendar date or time is invalid.");
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: rawZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
  } catch {
    throw new Error("Unknown time zone. Use a valid IANA time zone such as Europe/London.");
  }
  // A 15-minute offset grid covers present/future IANA zone offsets, including
  // 30- and 45-minute zones. Find every instant with the exact same wall clock.
  const matches: number[] = [];
  for (let delta = -15 * 60; delta <= 15 * 60; delta += 15) {
    const candidate = nominal + delta * 60_000;
    const parts = formatter.formatToParts(candidate);
    const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
    if (value("year") === year && value("month") === month && value("day") === day &&
        value("hour") === hour && value("minute") === minute) matches.push(candidate);
  }
  if (matches.length !== 1) {
    throw new Error(matches.length === 0
      ? "That local time does not exist in this time zone (daylight-saving change). Choose another time."
      : "That local time occurs twice in this time zone (daylight-saving change). Choose an unambiguous time or use UTC.");
  }
  return matches[0];
}

export function validateMaintenanceWindow(
  rawStart: unknown, rawStartZone: unknown, rawEnd: unknown, rawEndZone: unknown,
  now = Date.now(),
): { startAt: number; endAt: number; startTimeZone: string; endTimeZone: string } {
  const startAt = resolveMaintenanceWallTime(rawStart, rawStartZone);
  const endAt = resolveMaintenanceWallTime(rawEnd, rawEndZone);
  if (startAt < now + 30_000 || startAt > now + 365 * 86_400_000) {
    throw new Error("Maintenance start must be between 30 seconds and one year from now.");
  }
  if (endAt < startAt + 60_000 || endAt > startAt + 30 * 86_400_000) {
    throw new Error("Maintenance end must be at least one minute after the start, and no more than 30 days later.");
  }
  return {
    startAt, endAt, startTimeZone: rawStartZone as string,
    endTimeZone: rawEndZone as string,
  };
}
