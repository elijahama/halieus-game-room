import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./platform/components/ErrorBoundary";
import { GlobalGameActivity } from "./platform/components/GlobalGameActivity";
import { PlatformMaintenanceBanner } from "./platform/components/PlatformMaintenanceBanner";
import { IdentityAssetGuard } from "./platform/identity/IdentityAssetGuard";
import { WebKitConnectionRecovery } from "./platform/network/WebKitConnectionRecovery";
import { APP_VERSION, RELEASE_FINGERPRINT } from "./version";
import "@fontsource-variable/unbounded/wght.css";
import "@fontsource/righteous/400.css";
import "@fontsource/alata/400.css";
import "@fontsource-variable/fredoka/wght.css";
import "@fontsource/varela-round/400.css";
import "./index.css";
import "./styles/hgr-theme.css";
import "./styles/hgr-design-v1.css";
import "./styles/hgr-game-surfaces-v45.css";
import "./styles/hgr-part17.css";
import "./styles/hgr-4.5.1.css";
import "./styles/hgr-4.5.4-identity.css";
import "./styles/hgr-4.5.4.6-feature-rail.css";
import "./styles/hgr-4.5.5-mobile-hub.css";
import "./styles/hgr-4.5.5-part28-authority.css";
import "./styles/hgr-4.5.5-mega-board-portfolio.css";
import "./styles/hgr-4.5.5-unbounded.css";
import "./styles/hgr-4.5.5c-type-hierarchy.css";
import "./styles/hgr-4.5.5h-friends.css";
import "./styles/hgr-4.5.5i-emotion-midnight.css";
import "./styles/hgr-4.5.5j-achievement-type.css";
import "./styles/hgr-4.5.5l-library-view.css";

// Keep exact release identity available to diagnostics without permanently
// stamping it onto the visible website. Players can open Build Info on demand.
document.documentElement.dataset.halieusBuild = APP_VERSION;
document.documentElement.dataset.halieusRelease = RELEASE_FINGERPRINT;

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`/sw.js?release=${encodeURIComponent(RELEASE_FINGERPRINT)}`).catch((error) => console.warn("Halieus service worker registration failed", error));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <IdentityAssetGuard />
      <WebKitConnectionRecovery />
      <PlatformMaintenanceBanner />
      <App />
      <GlobalGameActivity />
    </ErrorBoundary>
  </React.StrictMode>,
);
