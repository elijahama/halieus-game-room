/** Browser-level fullscreen is deliberately conservative on Apple touch devices.
 * iPadOS can expose requestFullscreen while WebKit still produces black frames
 * when native form controls / select pickers are opened inside fullscreen.
 * HGR is already responsive, so retaining the normal viewport is safer there.
 */
export function isAppleTouchDevice(): boolean {
  const ua = navigator.userAgent ?? "";
  const platform = navigator.platform ?? "";
  return /iPad|iPhone|iPod/i.test(ua)
    || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function stableFullscreenAvailable(): boolean {
  return typeof document.documentElement.requestFullscreen === "function"
    && !isAppleTouchDevice();
}

export function fullscreenUnavailableMessage(): string {
  return isAppleTouchDevice()
    ? "Full screen is disabled on iPad/iPhone to prevent WebKit black-screen input bugs. HGR will keep the responsive browser view."
    : "Full screen is not available in this browser or installed window.";
}
