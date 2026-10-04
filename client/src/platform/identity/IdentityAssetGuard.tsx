import { useEffect } from "react";
import { APP_VERSION } from "../../version";

const INSTALL_IDENTITY_REVISION = `${APP_VERSION}-install-h3`;
const FAVICON_IDENTITY_REVISION = `${APP_VERSION}-brand-h7`;

function withVersion(path: string, revision: string): string {
  return `${path}?v=${revision}`;
}

function setHref(link: HTMLLinkElement | null, target: string): void {
  if (!link) return;
  if (link.getAttribute("href") !== target) link.setAttribute("href", target);
}

function applyIdentityAssets(): void {
  const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]'));
  for (const link of iconLinks) {
    if (link.id === "halieus-dynamic-favicon" || link.type === "image/svg+xml") {
      setHref(link, withVersion("/halieus-mark.svg", FAVICON_IDENTITY_REVISION));
    } else {
      setHref(link, withVersion("/favicon-32.png", INSTALL_IDENTITY_REVISION));
      link.type = "image/png";
      link.setAttribute("sizes", "32x32");
    }
  }

  setHref(document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]'), withVersion("/app-icon-180.png", INSTALL_IDENTITY_REVISION));
  setHref(document.querySelector<HTMLLinkElement>('link[rel="manifest"]'), withVersion("/site.webmanifest", INSTALL_IDENTITY_REVISION));
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
