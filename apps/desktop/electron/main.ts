import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let alwaysOnTop = true;
let miniMode = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    backgroundColor: "#0a0a0a",
    alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function applyMiniMode() {
  if (!mainWindow) return;
  if (miniMode) {
    mainWindow.setAlwaysOnTop(true, "floating");
    mainWindow.setResizable(true);
    mainWindow.setSize(420, 560);
    mainWindow.setMinimumSize(360, 420);
    mainWindow.setSkipTaskbar(false);
  } else {
    mainWindow.setSize(980, 720);
    mainWindow.setMinimumSize(800, 600);
  }
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+J", () => {
    if (!mainWindow) return;
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  });

  ipcMain.handle("toggleAlwaysOnTop", () => {
    if (!mainWindow) return;
    alwaysOnTop = !alwaysOnTop;
    mainWindow.setAlwaysOnTop(alwaysOnTop, "floating");
    return alwaysOnTop;
  });

  ipcMain.handle("toggleMiniMode", () => {
    miniMode = !miniMode;
    applyMiniMode();
    return miniMode;
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
