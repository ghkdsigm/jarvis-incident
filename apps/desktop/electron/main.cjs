const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");

let mainWindow = null;
let alwaysOnTop = true;
let miniMode = false;

function log(...args) {
  // eslint-disable-next-line no-console
  console.log("[jarvis-electron]", ...args);
}

process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[jarvis-electron][uncaughtException]", err);
});

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[jarvis-electron][unhandledRejection]", reason);
});

// Dev 환경에서 캐시/유저데이터 권한 문제로 렌더링이 꼬이는 케이스가 있어
// 임시 폴더를 사용해 안정적으로 띄웁니다.
if (!app.isPackaged) {
  try {
    const base = path.join(os.tmpdir(), "jarvis-desktop-dev");
    app.setPath("userData", path.join(base, "userData"));
    // Chromium 디스크 캐시 관련 권한 에러 완화
    app.commandLine.appendSwitch("disk-cache-dir", path.join(base, "cache"));
    app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
  } catch {
    // ignore
  }
}

function probeHttp(url) {
  return new Promise((resolve) => {
    try {
      const target = url.endsWith("/") ? url : `${url}/`;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      const req = http.request(
        target,
        {
          method: "GET",
          timeout: 450,
          headers: { "User-Agent": "jarvis-desktop-dev-probe" }
        },
        (res) => {
          // We want the Vite dev server specifically (avoid false positives when port is occupied).
          // Accept only responses that look like Vite HTML (contains /@vite/client).
          if (!res || typeof res.statusCode !== "number") {
            finish(false);
            return;
          }

          if (res.statusCode >= 500) {
            finish(false);
            res.resume();
            return;
          }

          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
            // Read a small prefix only; then decide.
            if (body.length > 8192) {
              try {
                res.destroy();
              } catch {
                // ignore
              }
            }
          });
          res.on("end", () => finish(body.includes("/@vite/client")));
          res.on("close", () => finish(body.includes("/@vite/client")));
        }
      );
      req.on("timeout", () => {
        try {
          req.destroy();
        } catch {
          // ignore
        }
        finish(false);
      });
      req.on("error", () => finish(false));
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
  log("createWindow()", { isPackaged: app.isPackaged, platform: process.platform });
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    backgroundColor: "#0a0a0a",
    alwaysOnTop,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 렌더러(브라우저) 콘솔/크래시를 메인 프로세스 로그로도 전달해서
  // "검정 화면" 원인을 터미널에서 바로 확인할 수 있게 합니다.
  mainWindow.webContents.on("console-message", (_e, level, message, line, sourceId) => {
    log("renderer:console", { level, message, line, sourceId });
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    log("renderer:gone", details);
  });
  mainWindow.webContents.on("unresponsive", () => log("renderer:unresponsive"));
  mainWindow.webContents.on("responsive", () => log("renderer:responsive"));

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;
    log("ready-to-show");
    try {
      // Windows에서 가끔 백그라운드/최소화로 떠서 안 보이는 케이스 방지
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[jarvis-electron][show/focus failed]", e);
    }
  });

  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    log("did-fail-load", { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log("did-finish-load");
  });
  mainWindow.webContents.on("dom-ready", () => {
    log("dom-ready");
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
        log("loadURL(dev)", devUrl);
        // Avoid unhandled rejections + allow Vite to boot.
        const url = devUrl.endsWith("/") ? devUrl : `${devUrl}/`;
        const tryLoad = async (attempt = 1) => {
          if (!mainWindow) return;
          try {
            await mainWindow.loadURL(url);
          } catch (e) {
            log("loadURL failed", { attempt, url, error: String(e && e.message ? e.message : e) });
            if (attempt < 25) setTimeout(() => void tryLoad(attempt + 1), 250);
          }
        };
        void tryLoad();
        mainWindow.webContents.openDevTools({ mode: "detach" });
      })
      .catch(() => {
        if (!mainWindow) return;
        log("loadURL(dev fallback)", "http://localhost:5173");
        void mainWindow.loadURL("http://localhost:5173/").catch((e) => {
          log("loadURL fallback failed", { error: String(e && e.message ? e.message : e) });
        });
        mainWindow.webContents.openDevTools({ mode: "detach" });
      });
  } else {
    log("loadFile(prod)", path.join(__dirname, "../dist/index.html"));
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    log("window closed");
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
  log("app.whenReady()");
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
  log("window-all-closed");
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => log("before-quit"));
app.on("will-quit", () => log("will-quit"));
app.on("quit", () => log("quit"));
