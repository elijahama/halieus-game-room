// Pure evidence validator. Not a deployment authorization or a signed attestation.
// Inputs must come from canonical HTTPS GitHub API endpoints for this exact commit,
// plus the local clean checkout whose release-integrity --verify has already passed.
// No deployment caller uses this module until a producer and full CI are validated.
const REPO = "elijahama/halieus-game-room";
const WORKFLOW = ".github/workflows/release-identity.yml";
const CONTEXT = "hgr/validated-release-v1";
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
const hash = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const reject = reason => ({ verified: false, reason });

export function validateReleaseCiProof({ local, commit, status, run, jobs } = {}) {
  if (!sha(local?.commitSha) || !hash(local?.sourceHash) ||
      typeof local?.version !== "string" || !/^\d+\.\d+\.\d+[a-z]?$/.test(local.version) ||
      local.fingerprint !== "hgr-" + local.version + "-" + local.sourceHash.slice(0,16))
    return reject("invalid-local-identity");
  if (commit?.sha !== local.commitSha || !Array.isArray(commit.parents))
    return reject("wrong-commit");
  if (!positive(run?.id) || !positive(run.run_attempt) ||
      run.repository?.full_name !== REPO || run.head_repository?.full_name !== REPO ||
      run.path !== WORKFLOW || run.head_branch !== "main" ||
      !["push","workflow_dispatch"].includes(run.event) ||
      run.status !== "completed" || run.conclusion !== "success")
    return reject("canonical-run-not-successful");
  const sourceMatches = run.head_sha === local.commitSha ||
    (commit.parents.length === 1 && sha(run.head_sha) &&
      commit.parents[0]?.sha === run.head_sha &&
      commit.commit?.message === "chore: refresh HGR release identity");
  if (!sourceMatches) return reject("run-source-mismatch");
  // Combined-status response for the exact pinned generated SHA; no old
  // successful status can override a later failed status for this context.
  if (status?.sha !== local.commitSha || !Array.isArray(status.statuses))
    return reject("wrong-status-commit");
  const receipts = status.statuses.filter(s => s?.context === CONTEXT);
  const receipt = receipts[0];
  if (receipts.length !== 1 || receipt.state !== "success" ||
      receipt.creator?.login !== "github-actions[bot]" || receipt.creator?.type !== "Bot" ||
      receipt.description !== "sha256:" + local.sourceHash ||
      receipt.target_url !== "https://github.com/" + REPO + "/actions/runs/" + run.id + "/attempts/" + run.run_attempt)
    return reject("exact-release-receipt-missing");
  if (!Array.isArray(jobs?.jobs) || jobs.total_count !== jobs.jobs.length)
    return reject("incomplete-job-evidence");
  for (const name of ["refresh-release-identity", "updater-windows-full-validation"]) {
    const matches = jobs.jobs.filter(job => job?.name === name);
    if (matches.length !== 1 || matches[0].run_id !== run.id ||
        matches[0].run_attempt !== run.run_attempt ||
        matches[0].status !== "completed" || matches[0].conclusion !== "success")
      return reject("required-job-not-successful");
  }
  return { verified: true, runId: run.id, runAttempt: run.run_attempt, commitSha: local.commitSha, sourceHash: local.sourceHash };
}
