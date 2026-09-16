import { app, BrowserWindow, shell } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PRODUCT_NAME = "Halieus Game Room";
const PRODUCTION_URL = "https://halieus.remotewire.net";
const DEFAULT_BOUNDS = { width: 1280, height: 780 };

app.setName(PRODUCT_NAME);

// Packaged clients are production-only. A developer may point an unpackaged
// Electron launch at localhost/Tailscale without creating an end-user switch.
function targetUrl() {
  if (app.isPackaged) return PRODUCTION_URL;
  const candidate = process.env.HALIEUS_DESKTOP_DEV_URL?.trim();
  if (!candidate) return PRODUCTION_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch { /* fall through to production */ }
  return PRODUCTION_URL;
}

function sameAllowedOrigin(url, allowedOrigin) {
  try { return new URL(url).origin === allowedOrigin; } catch { return false; }
}

function statePath() { return join(app.getPath("userData"), "window-state.json"); }
function loadBounds() {
  try {
    if (!existsSync(statePath())) return DEFAULT_BOUNDS;
    const value = JSON.parse(readFileSync(statePath(), "utf8"));
    const width = Number(value.width); const height = Number(value.height);
    return Number.isFinite(width) && Number.isFinite(height) && width >= 800 && height >= 600
      ? { width, height, x: Number.isFinite(value.x) ? value.x : undefined, y: Number.isFinite(value.y) ? value.y : undefined }
      : DEFAULT_BOUNDS;
  } catch { return DEFAULT_BOUNDS; }
}
function saveBounds(window) {
  try { writeFileSync(statePath(), JSON.stringify(window.getNormalBounds()), "utf8"); } catch { /* non-fatal */ }
}

function createWindow() {
  const target = targetUrl();
  const allowedOrigin = new URL(target).origin;
  const window = new BrowserWindow({
    ...loadBounds(),
    minWidth: 800,
    minHeight: 600,
    title: PRODUCT_NAME,
    icon: join(import.meta.dirname, "assets", "Halieus Game Room.ico"),
    backgroundColor: "#101113",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      devTools: !app.isPackaged,
    },
  });

  window.setMenu(null);
  window.once("ready-to-show", () => window.show());
  window.on("close", () => saveBounds(window));
  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
    if (!app.isPackaged && input.key === "F12") { event.preventDefault(); window.webContents.toggleDevTools(); }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (sameAllowedOrigin(url, allowedOrigin)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (sameAllowedOrigin(url, allowedOrigin)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });
  window.webContents.on("will-attach-webview", (event) => event.preventDefault());

  void window.loadURL(target);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
