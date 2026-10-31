import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const load = (p) => readFile(resolve(root, p), "utf8");
const [html, js, css, history, historyUi, versionPlan] = await Promise.all([
  load("client/public/control/index.html"),
  load("client/public/control/development.js"),
  load("client/public/control/control.css"),
  load("client/src/platform/projectTimeline.ts"),
  load("client/src/platform/components/ProjectTimeline.tsx"),
  load("docs/HGR_VERSION_ROADMAP.md"),
]);

for (const name of ["developmentDeliveryBatches", "developmentTournamentRoadmap", "deliveryTimelineHeading", "tournamentRoadmapHeading"]) {
  assert.match(html, new RegExp(`id="${name}"`), `Control needs a visible planned-work milestone target: ${name}`);
}
assert.match(html, /development\.js\?v=development-roadmap-v1/, "Refresh cached Development plan after release");
assert.match(html, /<ol id="developmentDeliveryBatches"/, "Timeline must expose ordered semantics");
for (const name of ["renderDeliveryPlan", "renderTournamentRoadmap", "DELIVERY_BATCHES", "TOURNAMENT_ROADMAP"]) {
  assert.ok(js.includes(name), `Plan rendering missing ${name}`);
}
for (const pr of [187, 188, 190]) {
  assert.match(js, new RegExp(`pr: ${pr}\\b`), `Existing audited release batch #${pr} must remain linked`);
}
for (const issue of [115, 182, 186, 153]) {
  assert.match(js, new RegExp(`issue: ${issue}\\b`), `Known follow-up requirement #${issue} must remain linked`);
}
for (const version of ["4.6.x", "4.7.x", "4.8.x", "4.9.x", "5.0.0"]) {
  assert.ok(js.includes(`version: "${version}"`), `Tournament family missing ${version}`);
  assert.ok(history.includes(`version: "${version}"`), `Public timeline missing ${version}`);
}
assert.match(js, /pulls\.find\(pull => Number\(pull\.number\) === batch\.pr\)/,
  "PR state must come from actual GitHub returned data rather than hard-coded job assumptions");
assert.match(js, /Status not in latest GitHub snapshot/, "Unknown source state must be visibly unknown");
assert.match(js, /A planned batch is not work running/, "Plan cannot pretend work is executing");
assert.match(js, /No.*hardware MAC address access/, "Do not promise impossible website MAC bans");
assert.match(js, /owner sign-off/i, "5.0 needs owner acceptance");
assert.match(js, /Tournament feature gate still requires owner acceptance|owner acceptance still required/i);
assert.match(history, /planned: true/, "5.0 roadmap must distinguish future work");
assert.doesNotMatch(history, /current: true/, "Old 4.1.0 cannot be marked the current build");
assert.match(historyUi, /currentVersion\.startsWith/, "Current badge must reflect actual running version");
assert.match(historyUi, /milestone\.planned \? "Planned/, "Planned releases must be labelled visibly");
assert.match(css, /\.development-delivery-track/, "Timeline needs a bounded in-flow track");
assert.match(css, /\.development-roadmap-stages/, "Long range milestones need responsive layout");
assert.match(versionPlan, /5\.0\.0.*reserved|5\.0\.0.*Complete Tournament Mode/i);
assert.doesNotMatch(js, /innerHTML|Math\.random\(|setInterval\(.*progress|eval\(/i,
  "Roadmap must not inject HTML or invent activity percentages");
const check = spawnSync(process.execPath, ["--check", resolve(root, "client/public/control/development.js")], { encoding: "utf8" });
assert.equal(check.status, 0, check.stderr);
console.log("PASS Control delivery batches and HGR 5.0 roadmap: real refs, honest states, mobile cards, owner acceptance, no fabricated progress.");
