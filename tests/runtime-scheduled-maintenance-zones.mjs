import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const dir = await mkdtemp(resolve(tmpdir(), "hgr-zoned-maintenance-"));
process.env.HALIEUS_DATA_DIR = dir;
const oldNow = Date.now;
try {
  const { resolveMaintenanceWallTime, validateMaintenanceWindow } =
    await import("../server/src/platform/maintenanceTimeZones.ts");
  const {
    loadPublicAccessState, getPublicAccessState, setPublicAccessState,
    schedulePublicMaintenance, cancelPublicMaintenance, enableMaintenanceScheduler,
    configureMaintenanceRoomCount, processScheduledWindow,
  } = await import("../server/src/platform/publicAccess.ts");

  assert.equal(resolveMaintenanceWallTime("2026-11-01T12:00", "Europe/London"),
    Date.parse("2026-11-01T12:00:00Z"), "London winter time");
  assert.equal(resolveMaintenanceWallTime("2026-07-01T12:00", "Europe/London"),
    Date.parse("2026-07-01T11:00:00Z"), "London summer time");
  assert.equal(resolveMaintenanceWallTime("2026-07-01T07:00", "America/New_York"),
    Date.parse("2026-07-01T11:00:00Z"), "New York same instant");
  assert.equal(resolveMaintenanceWallTime("2026-07-01T17:30", "Asia/Kolkata"),
    Date.parse("2026-07-01T12:00:00Z"), "Non-hourly UTC offset");
  assert.throws(() => resolveMaintenanceWallTime("2026-03-29T01:30", "Europe/London"),
    /does not exist/, "Spring DST gap must never be adjusted silently");
  assert.throws(() => resolveMaintenanceWallTime("2026-10-25T01:30", "Europe/London"),
    /occurs twice/, "Autumn DST ambiguity must not choose arbitrary offset");
  assert.throws(() => resolveMaintenanceWallTime("2026-02-30T12:00", "UTC"), /invalid/);
  assert.throws(() => resolveMaintenanceWallTime("2026-11-01T12:00", "Mars/Olympus"), /Unknown time zone/);
  const consistent = validateMaintenanceWindow(
    "2026-11-03T21:00", "Europe/London",
    "2026-11-03T17:00", "America/New_York",
    Date.parse("2026-11-01T00:00Z"));
  assert.equal(consistent.startAt, Date.parse("2026-11-03T21:00Z"));
  assert.equal(consistent.endAt, Date.parse("2026-11-03T22:00Z"));
  assert.throws(() => validateMaintenanceWindow(
    "2026-11-03T21:00","UTC","2026-11-03T20:30","UTC",Date.parse("2026-11-01T00:00Z")), /at least one minute/);

  let rooms = 2;
  configureMaintenanceRoomCount(() => rooms);
  assert.equal((await loadPublicAccessState()).closed, false);
  enableMaintenanceScheduler();
  const base = oldNow() + 100_000;
  let now = base;
  Date.now = () => now;
  const startAt = base + 60_000;
  const endAt = base + 160_000;
  const scheduled = await schedulePublicMaintenance(
    { startAt, endAt, startTimeZone:"Europe/London",endTimeZone:"America/New_York" },
    "Maintenance & changes", "owner-test");
  assert.equal(scheduled.closed, false, "Scheduling must not immediately close the site");
  assert.equal(scheduled.scheduledWindow?.status, "scheduled");
  assert.equal(scheduled.scheduledWindow?.startTimeZone,"Europe/London");
  assert.equal(scheduled.scheduledWindow?.endTimeZone,"America/New_York");
  assert.equal((await loadPublicAccessState()).scheduledWindow?.endAt,endAt,
    "Schedule must survive process reload");
  await assert.rejects(schedulePublicMaintenance(
    {startAt:startAt+70_000,endAt:endAt+70_000,startTimeZone:"UTC",endTimeZone:"UTC"},
    "Not accepted","owner-test"), /Cancel the existing/);

  now = startAt + 1000;
  await processScheduledWindow();
  assert.equal(getPublicAccessState().closed, false, "Active rooms must never be kicked");
  assert.equal(getPublicAccessState().scheduledWindow?.status,"waiting-for-rooms");
  await processScheduledWindow();
  assert.equal(getPublicAccessState().closed, false, "Still busy: recheck without closing");

  rooms = 0;
  now = startAt + 17_000;
  await processScheduledWindow();
  assert.equal(getPublicAccessState().closed, true, "Close only after rooms are empty");
  assert.equal(getPublicAccessState().scheduledWindow?.status,"active");
  assert.equal(getPublicAccessState().reopenAt,endAt, "Exact original end is retained after a delayed start");
  await loadPublicAccessState();
  assert.equal(getPublicAccessState().closed,true,"Active window recovered after restart");
  now=endAt+1000;
  await processScheduledWindow();
  assert.equal(getPublicAccessState().closed,false,"Reopen at exact end");
  assert.equal(getPublicAccessState().scheduledWindow?.status,"completed");
  assert.equal(getPublicAccessState().reopenAt,null);
  const saved=JSON.parse(await readFile(resolve(dir,"accounts","public-access.json"),"utf8"));
  assert.equal(saved.closed,false,"Completed reopening persisted");

  now = base + 200_000;
  rooms = 1;
  const lateStart = now + 50_000, lateEnd = lateStart + 70_000;
  await schedulePublicMaintenance({
    startAt:lateStart,endAt:lateEnd,startTimeZone:"UTC",endTimeZone:"UTC"
  },"Second window","owner-test");
  now=lateEnd+1000;
  await processScheduledWindow();
  assert.equal(getPublicAccessState().closed,false,"Missed window cannot start late");
  assert.equal(getPublicAccessState().scheduledWindow?.status,"missed");
  now=lateEnd+120_000;
  await schedulePublicMaintenance({
    startAt:now+60_000,endAt:now+120_000,startTimeZone:"UTC",endTimeZone:"UTC"
  },"Cancel this","owner-test");
  const cancelled=await cancelPublicMaintenance("owner-test");
  assert.equal(cancelled.scheduledWindow,null);
  assert.equal(cancelled.closed,false);
  await assert.rejects(cancelPublicMaintenance("owner-test"),/no pending/);

  await setPublicAccessState(false,"Fixture clean","owner-test");
  console.log("PASS timezone-aware maintenance: exact independent zones, DST gap/overlap, future persistence, waiting rooms, no late closure, precise reopening, cancel/restart.");
} finally {
  Date.now=oldNow;
  await rm(dir,{recursive:true,force:true});
}
