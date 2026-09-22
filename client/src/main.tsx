import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./platform/components/ErrorBoundary";
import { GlobalGameActivity } from "./platform/components/GlobalGameActivity";
import { APP_VERSION, RELEASE_FINGERPRINT } from "./version";
import "./index.css";
import "./styles/hgr-theme.css";

// Keep exact release identity available to diagnostics without permanently
// stamping it onto the visible website. Players can open Build Info on demand.
document.documentElement.dataset.halieusBuild = APP_VERSION;
document.documentElement.dataset.halieusRelease = RELEASE_FINGERPRINT;

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Halieus service worker registration failed", error));
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <GlobalGameActivity />
    </ErrorBoundary>
  </React.StrictMode>,
);
