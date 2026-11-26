(() => {
  "use strict";
  const notice = document.getElementById("controlReleaseNotice");
  const title = document.getElementById("controlReleaseTitle");
  const detail = document.getElementById("controlReleaseDetail");
  const review = document.getElementById("controlReleaseReview");
  const dismiss = document.getElementById("controlReleaseDismiss");
  const operation = document.getElementById("operationToast");
  if (!notice || !title || !detail || !review || !dismiss) return;

  const POLL_MS = 5 * 60_000;
  let authorised = false;
  let inflight = false;
  let lastChecked = 0;
  let available = null;
  // Acknowledgement is local to this page session, not global release state.
  // The Update tab remains marked; a different fingerprint may alert again.
  const acknowledged = new Set();
  function render() {
    document.getElementById("operationTabUpdate")?.classList.toggle("has-release", Boolean(available));
    const running = operation?.dataset.state === "running" && !operation.hidden;
    const visible = Boolean(available && !acknowledged.has(available.candidateFingerprint) && !running);
    if (visible && available) {
      title.textContent = `HGR ${available.candidateVersion} is ready`;
      detail.textContent = `Public website: ${available.installedVersion}. Release checks passed. Review the update when ready.`;
    }
    notice.hidden = !visible;
  }
  function acknowledge() {
    if (available) acknowledged.add(available.candidateFingerprint);
    render();
  }
  async function checkRelease() {
    if (!authorised || inflight) return;
    inflight = true;
    lastChecked = Date.now();
    try {
      const response = await fetch("/control/release-availability", {
        credentials: "include", cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Release check unavailable");
      const release = await response.json();
      if (release?.ok !== true || release.status !== "available" ||
          typeof release.candidateVersion !== "string" ||
          !/^\d+\.\d+\.\d+[a-z]?$/.test(release.candidateVersion) ||
          typeof release.installedVersion !== "string" ||
          !/^\d+\.\d+\.\d+$/.test(release.installedVersion) ||
          typeof release.candidateFingerprint !== "string" ||
          !release.candidateFingerprint.startsWith("hgr-" + release.candidateVersion + "-") ||
          !/[a-f0-9]{16}$/.test(release.candidateFingerprint)) {
        available = null;
      } else {
        available = release;
      }
    } catch { available = null; }
    finally { inflight = false; render(); }
  }
  review.addEventListener("click", () => {
    acknowledge();
    document.querySelector('[data-section="operations"]')?.click();
    document.getElementById("operationTabUpdate")?.click();
  });
  dismiss.addEventListener("click", acknowledge);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !notice.hidden) acknowledge();
  });
  if (operation) new MutationObserver(render).observe(operation, {
    attributes: true, attributeFilter: ["hidden", "data-state"],
  });
  window.addEventListener("hgr-control-authorized", () => {
    authorised = true;
    void checkRelease();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastChecked > 60_000)
      void checkRelease();
  });
  window.setInterval(() => {
    if (authorised && document.visibilityState === "visible") void checkRelease();
  }, POLL_MS);
})();
