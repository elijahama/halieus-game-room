import { randomUUID } from "node:crypto";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getAccountDataDirectory } from "./dataPaths.js";

/**
 * Public visitor gate, not a process shutdown. Control, authentication and
 * health endpoints stay available even while the public Game Room is closed.
 * This is deliberately independent of temporary deploy/restart notices.
 */
export interface HgrPublicAccessState {
  closed: boolean;
  reason: string;
  updatedAt: number;
  updatedBy: string;
  /** UTC timestamp in milliseconds; null means manual reopening only. */
  reopenAt: number | null;
}
const file = resolve(getAccountDataDirectory(), "public-access.json");
const DEFAULT_REASON = "The Game Room is temporarily closed. Please check back later.";
const fresh = (): HgrPublicAccessState => ({ closed: false, reason: DEFAULT_REASON, updatedAt: 0, updatedBy: "system", reopenAt: null });
let state = fresh();
let changeListener: ((next: HgrPublicAccessState) => void) | null = null;
let writes: Promise<unknown> = Promise.resolve();
let reopenTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export function getPublicAccessState(): HgrPublicAccessState { return { ...state }; }
export function isPublicGameRoomClosed(): boolean { return state.closed; }
export function onPublicAccessChanged(listener: (next: HgrPublicAccessState) => void): () => void {
  changeListener = listener;
  return () => { if (changeListener === listener) changeListener = null; };
}
export function cleanMaintenanceReason(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_REASON;
  return raw.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, 220) || DEFAULT_REASON;
}
export async function loadPublicAccessState(): Promise<HgrPublicAccessState> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || typeof (parsed as any).closed !== "boolean")
      throw Error("Malformed public access state");
    const value = parsed as Partial<HgrPublicAccessState>;
    state = {
      closed: value.closed === true,
      reason: cleanMaintenanceReason(value.reason),
      updatedAt: Number.isFinite(value.updatedAt) ? Number(value.updatedAt) : 0,
      updatedBy: typeof value.updatedBy === "string" ? value.updatedBy.slice(0, 120) : "system",
      reopenAt: typeof value.reopenAt === "number" && Number.isSafeInteger(value.reopenAt) && value.reopenAt > 0
        ? Number(value.reopenAt) : null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") state = fresh();
    else {
      // A damaged closure record must never silently re-open public gameplay.
      state = { closed: true, reason: DEFAULT_REASON, updatedAt: Date.now(), updatedBy: "recovery", reopenAt: null };
      console.error("[HGR] Public access state unreadable; closed for visitors until owner repair.");
    }
  }
  armScheduledReopen();
  return getPublicAccessState();
}
/**
 * All access mutations share a serialized persistence queue. In particular,
 * an expired timer must not reopen a newer owner-created closure.
 */
function enqueueAccessChange(makeNext: () => HgrPublicAccessState | null): Promise<HgrPublicAccessState> {
  const work = writes.then(async () => {
    const next = makeNext();
    if (!next) return getPublicAccessState();
    const previous = state;
    // Block new public connections immediately; restore the prior gate if disk fails.
    state = next;
    try {
      await mkdir(getAccountDataDirectory(), { recursive: true });
      const tmp = file + "." + randomUUID() + ".tmp";
      await writeFile(tmp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
      await rename(tmp, file);
    } catch (error) {
      state = previous;
      throw error;
    }
    armScheduledReopen();
    try { changeListener?.(getPublicAccessState()); }
    catch (error) { console.error("[HGR] Public mode notification failed", error); }
    return getPublicAccessState();
  });
  writes = work.then(() => undefined, () => undefined);
  return work;
}

export function setPublicAccessState(
  closed: boolean, reason: unknown, by: string, reopenAt: number | null = null,
): Promise<HgrPublicAccessState> {
  return enqueueAccessChange(() => ({
    closed,
    reason: cleanMaintenanceReason(reason),
    updatedAt: Date.now(),
    updatedBy: by.slice(0, 120),
    reopenAt: closed && typeof reopenAt === "number" && Number.isSafeInteger(reopenAt) && reopenAt > 0 ? reopenAt : null,
  }));
}

async function reopenWhenDue(): Promise<void> {
  try {
    await enqueueAccessChange(() => {
      if (!state.closed || state.reopenAt === null || state.reopenAt > Date.now()) return null;
      return {
        closed: false,
        reason: DEFAULT_REASON,
        updatedAt: Date.now(),
        updatedBy: "automatic-reopen",
        reopenAt: null,
      };
    });
  } catch (error) {
    console.error("[HGR] Scheduled public reopening could not be persisted; retrying.", error);
    // A write failure must not report the site reopened. Retry while server remains alive.
    if (state.closed && state.reopenAt !== null) {
      reopenTimer = setTimeout(() => void reopenWhenDue(), 10_000);
      reopenTimer.unref?.();
    }
  }
}

function armScheduledReopen(): void {
  if (reopenTimer) clearTimeout(reopenTimer);
  reopenTimer = null;
  if (!state.closed || state.reopenAt === null) return;
  const remaining = Math.max(0, state.reopenAt - Date.now());
  reopenTimer = setTimeout(() => void reopenWhenDue(), Math.min(remaining, MAX_TIMER_DELAY_MS));
  reopenTimer.unref?.();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
/** HTML never references custom/replacement H artwork. */
export function renderPublicClosedPage(reason: string, reopenAt: number | null = null): string {
  const safeReason = escapeHtml(cleanMaintenanceReason(reason));
  const validReopenAt = typeof reopenAt === "number" && Number.isSafeInteger(reopenAt) && reopenAt > 0 ? reopenAt : null;
  const reopenNotice = validReopenAt === null ? "" :
    `<p>Scheduled reopening: <time datetime="${new Date(validReopenAt).toISOString()}">${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(validReopenAt)}</time></p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Game Room temporarily closed · HGR</title>
<style>
:root{color-scheme:dark;font-family:Alata,system-ui,sans-serif}
*{box-sizing:border-box}body{min-height:100dvh;margin:0;display:grid;place-items:center;background:#07101e;color:#f0f4ff;padding:20px}
main{width:min(100%,560px);border:1px solid #35445d;border-radius:22px;padding:clamp(20px,5vw,40px);background:#111b2d;box-shadow:0 18px 46px #0004}
small{letter-spacing:.14em;color:#96baff;text-transform:uppercase}
h1{font-size:clamp(1.7rem,6vw,2.6rem);line-height:1.13;margin:.7em 0}
p{color:#b9c6d9;line-height:1.6;overflow-wrap:anywhere}
a{color:#86b8ff}details{border-top:1px solid #35445d;margin-top:24px;padding-top:18px}
summary{cursor:pointer;color:#cad8ef}label{display:grid;gap:5px;margin:12px 0;color:#d2dcf0}
input{width:100%;padding:12px;border-radius:10px;border:1px solid #536784;background:#0b1526;color:#fff;font:inherit}
button{min-height:44px;cursor:pointer;background:#298aff;color:#07111c;border:0;border-radius:11px;padding:10px 19px;font:700 1rem system-ui}
button:disabled{opacity:.55}button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:3px}
</style></head><body><main><small>Halieus Game Room · Maintenance</small>
<h1>The Game Room is temporarily closed</h1>
<p>${safeReason}</p>${reopenNotice}<p>Existing account information and saved game history are preserved. Please return after reopening.</p>
<details><summary>Owner access to Control</summary><p>If you are already signed in, <a href="/control/">open HGR Control</a>. Otherwise sign in below.</p>
<form id="controlLogin"><label>Username<input name="username" autocomplete="username" required maxlength="32"></label>
<label>Password<input name="password" type="password" autocomplete="current-password" required></label>
<button type="submit">Sign in to Control</button><p id="loginResult" role="status"></p></form></details>
</main><script>
document.getElementById("controlLogin").addEventListener("submit",async function(e){
 e.preventDefault();const button=this.querySelector("button"),status=document.getElementById("loginResult");
 button.disabled=true;status.textContent="Checking account…";
 try{
  const form=new FormData(this);
  const response=await fetch("/auth/login",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({username:form.get("username"),password:form.get("password")})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error("Sign-in was not accepted.");
  if(data.account?.role!=="owner"&&data.account?.role!=="admin"){status.textContent="Control requires an owner or administrator account.";return}
  location.assign("/control/");
 }catch{status.textContent="Could not sign in. Check the account or connection."}
 finally{button.disabled=false}
});
</script></body></html>`;
}
