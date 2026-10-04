import { useEffect } from "react";

const IDENTITY_REVISION = "install-h3";

function withIdentity(path: string): string {
  return `${path}?identity=${IDENTITY_REVISION}`;
}

function applyIdentityAssets(): void {
  const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]'));
  for (const link of iconLinks) {
    if (link.id === "halieus-dynamic-favicon" || link.type === "image/svg+xml") {
      link.href = withIdentity("/halieus-mark.svg");
    } else {
      link.href = withIdentity("/favicon-32.png");
      link.type = "image/png";
      link.sizes = "32x32";
    }
  }

  const appleTouch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleTouch) appleTouch.href = withIdentity("/app-icon-180.png");

  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.href = withIdentity("/site.webmanifest");
}

export function IdentityAssetGuard() {
  useEffect(() => {
    applyIdentityAssets();

    const head = document.head;
    const observer = new MutationObserver(() => applyIdentityAssets());
    observer.observe(head, { attributes: true, childList: true, subtree: true, attributeFilter: ["href"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
