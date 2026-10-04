import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountApi = await readFile(new URL("../client/src/platform/accounts/api.ts", import.meta.url), "utf8");
const recovery = await readFile(new URL("../client/src/platform/network/WebKitConnectionRecovery.tsx", import.meta.url), "utf8");
const main = await readFile(new URL("../client/src/main.tsx", import.meta.url), "utf8");
const app = await readFile(new URL("../client/src/App.tsx", import.meta.url), "utf8");

assert.match(accountApi, /AUTH_BOOTSTRAP_TIMEOUT_MS\s*=\s*7_000/, "auth bootstrap must have a bounded timeout");
assert.match(accountApi, /path === "\/auth\/status"/, "the timeout must stay scoped to initial auth status rather than unrelated account mutations");
assert.match(accountApi, /controller\.abort\("account-timeout"\)/, "auth timeout must actively abort a hung WebKit fetch");
assert.match(accountApi, /cache:\s*init\.cache\s*\?\?\s*"no-store"/, "auth bootstrap must bypass stale browser caches");
assert.equal((accountApi.match(/fetchAuthBootstrap\(path, init\)/g) || []).length, 2, "auth bootstrap must retry exactly once after a stalled transport");
assert.match(accountApi, /HGR could not finish checking your account/, "two failed bootstrap attempts must become a visible recoverable error");

assert.match(recovery, /iPad\|iPhone\|iPod/, "classic iPad/iOS WebKit must be detected");
assert.match(recovery, /navigator\.platform === "MacIntel" && navigator\.maxTouchPoints > 1/, "desktop-class iPadOS user agents must be detected");
assert.match(recovery, /visibilitychange/, "resume from background must be handled");
assert.match(recovery, /pageshow/, "BFCache restore must be handled");
assert.match(recovery, /window\.addEventListener\("online"/, "network return must be handled");
assert.match(recovery, /socket\.disconnect\(\)/, "stale WebKit transports must be discarded on a forced recovery");
assert.match(recovery, /socket\.connect\(\)/, "socket recovery must establish a fresh transport");
assert.match(main, /<WebKitConnectionRecovery \/>/, "the recovery lifecycle must be mounted at the app root");

assert.match(app, /Boolean\(authStatus\) \|\| Boolean\(authLoadError\)/, "the existing first-paint curtain must release on either auth success or bounded auth failure");

console.log("4.5.4.11 iPad boot/reconnect regression passed.");
