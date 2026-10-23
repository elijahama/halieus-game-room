import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getGuildDataDirectory } from "./dataPaths.js";

/** Durable, account-scoped message acknowledgement. NOT message content. */
interface Receipts {
  read: Record<string, string[]>;
  popped: Record<string, string[]>;
}
const file = resolve(getGuildDataDirectory(), "guild-message-receipts.json");
const CAP = 600;
const records: Receipts = { read: {}, popped: {} };
let queue = Promise.resolve();
const limited = (keys: string[]): string[] => [...new Set(keys)].slice(-CAP);
function list(accountId: string, kind: keyof Receipts): string[] {
  return records[kind][accountId] ?? [];
}
async function persist(): Promise<void> {
  const snapshot = JSON.stringify({ version: 1, records });
  queue = queue.catch(() => undefined).then(async () => {
    await mkdir(getGuildDataDirectory(), { recursive: true });
    const tmp = file + ".tmp";
    await writeFile(tmp, snapshot, "utf8");
    await rename(tmp, file);
  });
  await queue;
}
export async function loadGuildMessageReceipts(): Promise<void> {
  records.read = {};
  records.popped = {};
  try {
    const source = JSON.parse(await readFile(file, "utf8")) as { records?: Partial<Receipts> };
    for (const kind of ["read", "popped"] as const) {
      for (const [account, keys] of Object.entries(source.records?.[kind] ?? {})) {
        if (!Array.isArray(keys) || account.length > 150) continue;
        records[kind][account] = limited(keys.filter(
          (v): v is string => typeof v === "string" && /^guild-message:[a-z0-9-]{5,110}$/.test(v),
        ));
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
export function messageReceiptsFor(accountId: string): { readKeys: string[]; popupKeys: string[] } {
  return { readKeys: [...list(accountId, "read")], popupKeys: [...list(accountId, "popped")] };
}
/** Called only after the route validates the keys against this account's guild feed. */
export async function acknowledgeGuildMessages(
  accountId: string, kind: "read" | "popup", visibleKeys: string[],
): Promise<{ claimedKey: string | null }> {
  const keys = limited(visibleKeys);
  if (keys.length === 0) return { claimedKey: null };
  const oldPopped = new Set(list(accountId, "popped"));
  const read = new Set(list(accountId, "read"));
  const claimedKey = kind === "popup"
    ? keys.find(key => !oldPopped.has(key) && !read.has(key)) ?? null
    : null;
  if (kind === "popup" && claimedKey === null) return { claimedKey: null };
  // Mark all visible previously unseen items as having had a popup opportunity;
  // do not replay historical banners one-by-one on subsequent polls/devices.
  if (kind === "popup") records.popped[accountId] = limited([...keys, ...list(accountId, "popped")]);
  else {
    records.read[accountId] = limited([...keys, ...list(accountId, "read")]);
    records.popped[accountId] = limited([...keys, ...list(accountId, "popped")]);
  }
  await persist();
  return { claimedKey };
}
