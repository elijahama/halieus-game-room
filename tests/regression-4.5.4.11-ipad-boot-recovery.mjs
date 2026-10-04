import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const accountApi = await readFile(new URL("../client/src/platform/accounts/api.ts", import.meta.url), "utf8");
const recovery = await readFile(new URL("../client/src/platform/network/WebKitConnectionRecovery.tsx", import.meta.url), "utf8");
const main = await readFile(new URL("../client/src/main.tsx", import.meta.url), "utf8");
const app = await readFile(new URL("../client/src/App.tsx", import.meta.url), "utf8");

assert.match(accountApi, /DEFAULT_ACCOUNT_TIMEOUT_MS\s*=\s*10_000/, "account bootstrap must have a bounded timeout");
assert.match(accountApi, /controller\.abort\("account-timeout"\)/, "account timeout must actively abort a hung WebKit fetch");
assert.match(accountApi, /cache:\s*init\.cache\s*\?\?\s*\(method === "GET" \? "no-store" : "default"\)/, "GET account bootstrap requests must bypass stale browser caches");
assert.match(accountApi, /HGR could not finish checking your account/, "timed-out auth bootstrap must become a visible recoverable error");

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
