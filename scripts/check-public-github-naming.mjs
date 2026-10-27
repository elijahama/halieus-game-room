/**
 * Public GitHub naming guard.
 * Checks NEW PR metadata only; avoids disrupting older, active work.
 * This is intentionally not a Git-history rewrite or mass branch deleter.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const POLICY_STARTED_AT = "2026-10-27T00:00:00Z";
const numberedConversation = /\bpart(?:[\s_\/-]*\d+)(?:\b|[-_])/i;

export function publicNameViolations({ title = "", branch = "" } = {}) {
  return [
    ...(numberedConversation.test(title) ? ["PR title"] : []),
    ...(numberedConversation.test(branch) ? ["PR branch"] : []),
  ];
}

export function checkPublicNameEvent(event) {
  const pr = event?.pull_request;
  if (!pr) return { enforced: false, violations: [] };
  const createdAt = Date.parse(pr.created_at ?? "");
  if (!Number.isFinite(createdAt)) return { enforced: true, violations: ["Missing PR creation date"] };
  if (createdAt < Date.parse(POLICY_STARTED_AT)) return { enforced: false, violations: [] };
  return { enforced: true, violations: publicNameViolations({
    title: pr.title,
    branch: pr.head?.ref ?? "",
  }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    console.log("Public naming guard: no GitHub PR context; use the unit test.");
  } else {
    const result = checkPublicNameEvent(JSON.parse(readFileSync(eventPath, "utf8")));
    if (result.violations.length) {
      console.error("Public GitHub name violates the HGR naming policy: " + result.violations.join(", "));
      console.error("Use a descriptive subsystem/feature name and semantic version; keep conversation numbering private.");
      process.exitCode = 1;
    } else {
      console.log(result.enforced
        ? "PASS public GitHub branch/title naming"
        : "PASS historical pull request preserved (naming policy not retroactive)");
    }
  }
}
