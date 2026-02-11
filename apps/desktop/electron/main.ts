// NOTE:
// 이 파일(`main.ts`)은 Electron 런타임에서 그대로 실행할 수 없어(dev/prod 모두)
// 현재 엔트리는 `main.cjs`를 사용합니다.
// - package.json: main = electron/main.cjs
// - electron-builder.json: extraMetadata.main = electron/main.cjs
//
// (원하면 추후 TS 빌드 파이프라인을 추가해 다시 사용 가능합니다.)

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
    },
    autoHideMenuBar: true
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

  ipcMain.handle("getWindowState", () => {
    return { alwaysOnTop, miniMode };
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
