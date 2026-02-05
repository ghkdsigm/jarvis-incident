const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("node:path");

let mainWindow = null;
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

  // Dev에서는 Vite dev server를 로드합니다.
  // `VITE_DEV_SERVER_URL`이 없을 때를 대비해 기본 포트를 사용합니다.
  if (!app.isPackaged) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devUrl);
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

    // IMPORTANT: minimum size를 먼저 낮춰야 setSize가 먹습니다.
    mainWindow.setMinimumSize(360, 420);
    mainWindow.setSize(420, 560);

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

