import assert from "node:assert/strict";
import { sourceBaselineForVersion } from "../scripts/source-baseline.mjs";

const cases = [
  ["4.0.0", "4.0", true],
  ["4.1.1", "4.0", false],
  ["4.4.9", "4.0", false],
  ["4.5.0", "4.5", true],
  ["4.9.9", "4.5", false],
  ["5.0.0", "5.0", true],
  ["5.4.2", "5.0", false],
  ["5.5.0", "5.5", true],
  ["6.0.0", "6.0", true],
  ["6.5.0", "6.5", true],
];

for (const [version, baseline, milestone] of cases) {
  const actual = sourceBaselineForVersion(version);
  assert.equal(actual.baseline, baseline, `${version} should use source baseline ${baseline}`);
  assert.equal(actual.milestone, milestone, `${version} milestone state mismatch`);
}

assert.throws(() => sourceBaselineForVersion("4.1"), /Invalid HGR version/);
assert.throws(() => sourceBaselineForVersion("banana"), /Invalid HGR version/);

console.log("HGR source baseline policy regression: PASS");
