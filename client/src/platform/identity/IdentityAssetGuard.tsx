import { useEffect } from "react";

const IDENTITY_REVISION = "install-h3";

function withIdentity(path: string): string {
  return `${path}?identity=${IDENTITY_REVISION}`;
}

function setHref(link: HTMLLinkElement | null, target: string): void {
  if (!link) return;
  if (link.getAttribute("href") !== target) link.setAttribute("href", target);
}

function applyIdentityAssets(): void {
  const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]'));
  for (const link of iconLinks) {
    if (link.id === "halieus-dynamic-favicon" || link.type === "image/svg+xml") {
      setHref(link, withIdentity("/halieus-mark.svg"));
    } else {
      setHref(link, withIdentity("/favicon-32.png"));
      link.type = "image/png";
      link.sizes = "32x32";
    }
  }

  setHref(document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]'), withIdentity("/app-icon-180.png"));
  setHref(document.querySelector<HTMLLinkElement>('link[rel="manifest"]'), withIdentity("/site.webmanifest"));
}

export function IdentityAssetGuard() {
  useEffect(() => {
    applyIdentityAssets();

    const observer = new MutationObserver(() => applyIdentityAssets());
    observer.observe(document.head, { attributes: true, childList: true, subtree: true, attributeFilter: ["href"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
