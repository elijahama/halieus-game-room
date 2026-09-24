import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function sourceBaselineForVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) throw new Error(`Invalid HGR version: ${version}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const baselineMinor = Math.floor(minor / 5) * 5;
  return {
    version: `${major}.${minor}.${patch}`,
    baseline: `${major}.${baselineMinor}`,
    milestone: patch === 0 && minor % 5 === 0,
  };
}

export function readCurrentSourceBaseline() {
  const version = readFileSync(resolve(root, "VERSION"), "utf8").trim();
  return sourceBaselineForVersion(version);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const info = readCurrentSourceBaseline();
  const outputIndex = process.argv.indexOf("--github-output");
  if (outputIndex >= 0) {
    const target = process.argv[outputIndex + 1];
    if (!target) throw new Error("--github-output requires a file path");
    const { appendFileSync } = await import("node:fs");
    appendFileSync(target, `version=${info.version}\nbaseline=${info.baseline}\nmilestone=${info.milestone ? "true" : "false"}\n`);
  } else if (process.argv.includes("--json")) {
    console.log(JSON.stringify(info, null, 2));
  } else {
    console.log(`HGR ${info.version} -> source baseline ${info.baseline}${info.milestone ? " (milestone refresh)" : ""}`);
  }
}
