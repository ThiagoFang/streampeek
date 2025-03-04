import { app, Tray, BrowserWindow, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let tray = null;
let window = null;
app.whenReady().then(() => {
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "logo_streampeek.png"));
  window = new BrowserWindow({
    width: 300,
    height: 400,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  window.loadURL("http://localhost:5173");
  tray.on("click", (_event, bounds) => {
    if (!window) return;
    if (window.isVisible()) {
      window.hide();
    } else {
      const { x, y } = bounds;
      const { width, height } = window.getBounds();
      if (process.platform === "darwin") {
        window.setPosition(x - width / 2, y);
      } else {
        window.setPosition(x - width / 2, y - height - 16);
      }
      window.show();
    }
  });
  window.on("blur", () => {
    window == null ? void 0 : window.hide();
  });
  const contextMenu = Menu.buildFromTemplate([
    { label: "Sair", click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
