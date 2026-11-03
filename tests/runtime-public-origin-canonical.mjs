import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HGR_CANONICAL_PUBLIC_ORIGIN, normaliseHgrPublicOrigin } from "../server/src/platform/publicOrigin.ts";

const canonical = "https://halieus.remotewire.net";
assert.equal(HGR_CANONICAL_PUBLIC_ORIGIN, canonical);
for (const old of ["https://play.halieus.net", "http://play.halieus.net/",
  "https://play.halieus.net/rooms/ABCD", " https://play.halieus.net/ "]) {
  assert.equal(normaliseHgrPublicOrigin(old), canonical, old);
}
assert.equal(normaliseHgrPublicOrigin(canonical + "/control/"), canonical);
assert.equal(normaliseHgrPublicOrigin("http://localhost:5173/play"), "http://localhost:5173");
assert.equal(normaliseHgrPublicOrigin("https://example.com"), "https://example.com");
assert.equal(normaliseHgrPublicOrigin("not-a-url"), null);
assert.equal(normaliseHgrPublicOrigin("javascript:alert(1)"), null);
assert.equal(normaliseHgrPublicOrigin("*"), null);
assert.equal(normaliseHgrPublicOrigin(undefined), null);
const root = resolve(import.meta.dirname,"..");
const read = (rel) => readFileSync(resolve(root,rel),"utf8");
const server = read("server/src/index.ts");
assert.match(server, /normaliseHgrPublicOrigin\(process\.env\.PUBLIC_APP_URL\)/);
assert.match(server, /normaliseHgrPublicOrigin\(value\) \?\? value/);
for (const rel of [
  "scripts/windows/start-production.ps1", "server/start-production.ps1",
  "server/start-background.ps1", "server/.env.example",
  "deploy/oracle/halieus.env.example"
]) {
  const s = read(rel);
  assert.ok(s.includes(canonical), rel + " must use canonical public origin");
  assert.ok(!s.includes("play.halieus.net"), rel + " must not advertise nonexistent domain");
}
assert.match(read("deploy/oracle/nginx-halieus.remotewire.net.conf"), /server_name halieus\.remotewire\.net/);
assert.ok(!read("scripts/windows/post-update-client.ps1").includes("play\\.halieus\\.net"));
console.log("PASS HGR public origin: active configuration, legacy env remapping, local origins");
