const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("node:path");
const http = require("node:http");

let mainWindow = null;
let alwaysOnTop = true;
let miniMode = false;

function probeHttp(url) {
  return new Promise((resolve) => {
    try {
      const req = http.request(
        url,
        {
          method: "GET",
          timeout: 450,
          headers: { "User-Agent": "jarvis-desktop-dev-probe" }
        },
        (res) => {
          // Any response means server is alive; prefer 2xx/3xx but accept 4xx as "alive" too.
          resolve(Boolean(res && typeof res.statusCode === "number" && res.statusCode < 500));
          res.resume();
        }
      );
      req.on("timeout", () => {
        try {
          req.destroy();
        } catch {
          // ignore
        }
        resolve(false);
      });
      req.on("error", () => resolve(false));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function resolveDevUrl() {
  // 1) Explicit override always wins
  if (process.env.VITE_DEV_SERVER_URL) return process.env.VITE_DEV_SERVER_URL;

  // 2) Try the usual Vite ports (Vite auto-increments if 5173 is busy)
  const host = process.env.VITE_DEV_SERVER_HOST || "localhost";
  const start = Number(process.env.VITE_DEV_SERVER_PORT || 5173);
  const candidates = [];
  for (let p = start; p < start + 20; p++) candidates.push(`http://${host}:${p}`);

  for (const u of candidates) {
    // probe root so we don't accidentally hit some random 5173 service that's not Vite
    // (still best-effort; but better than hardcoding 5173)
    // eslint-disable-next-line no-await-in-loop
    const ok = await probeHttp(u);
    if (ok) return u;
  }

  // 3) Last resort: old default
  return `http://${host}:5173`;
}

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

  // Ctrl + 마우스휠 / 트랙패드 핀치 줌(Visual Zoom)을 허용합니다.
  // 일부 환경/설정에서 visual zoom 제한이 0..0/1..1로 묶여 있으면 확대/축소가 동작하지 않습니다.
  // (zoom level: 0=100%, -1≈80%, 1≈125%)
  try {
    const p = mainWindow.webContents.setVisualZoomLevelLimits(-8, 9);
    // Electron 버전에 따라 Promise를 반환할 수 있어 안전 처리
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    // ignore
  }

  // Dev에서는 Vite dev server를 로드합니다.
  // `VITE_DEV_SERVER_URL`이 없을 때를 대비해 기본 포트를 사용합니다.
  if (!app.isPackaged) {
    resolveDevUrl()
      .then((devUrl) => {
        if (!mainWindow) return;
        mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools({ mode: "detach" });
      })
      .catch(() => {
        if (!mainWindow) return;
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools({ mode: "detach" });
      });
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

