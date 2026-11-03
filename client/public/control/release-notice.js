(() => {
  "use strict";

  const notice = document.getElementById("controlReleaseNotice");
  const title = document.getElementById("controlReleaseTitle");
  const detail = document.getElementById("controlReleaseDetail");
  const review = document.getElementById("controlReleaseReview");
  if (!notice || !title || !detail || !review) return;

  const POLL_MS = 5 * 60_000;
  let authorised = false;
  let inflight = false;
  let lastChecked = 0;

  function hideNotice() {
    notice.hidden = true;
    document.getElementById("operationTabUpdate")?.classList.remove("has-release");
  }

  async function checkRelease() {
    if (!authorised || inflight) return;
    inflight = true;
    lastChecked = Date.now();
    try {
      const response = await fetch("/control/release-availability", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Release check unavailable");
      const release = await response.json();
      // A PR, a different fingerprint with the same version, an offline
      // laptop, or an unverified GitHub request must never trigger this alert.
      if (release?.ok !== true || release.status !== "available" ||
          typeof release.candidateVersion !== "string" ||
          !/^\d+\.\d+\.\d+$/.test(release.candidateVersion) ||
          typeof release.installedVersion !== "string" ||
          !/^\d+\.\d+\.\d+$/.test(release.installedVersion)) {
        hideNotice();
        return;
      }
      title.textContent = `HGR ${release.candidateVersion} is ready`;
      detail.textContent = `Public website: ${release.installedVersion}. A newer merged release is available for review. Updating is a separate owner action.`;
      notice.hidden = false;
      document.getElementById("operationTabUpdate")?.classList.add("has-release");
    } catch {
      // Unknown is not current; it also must never be displayed as confirmed.
      hideNotice();
    } finally {
      inflight = false;
    }
  }

  review.addEventListener("click", () => {
    document.querySelector('[data-section="operations"]')?.click();
    document.getElementById("operationTabUpdate")?.click();
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
