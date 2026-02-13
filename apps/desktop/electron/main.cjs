const { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell, desktopCapturer, session } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const { spawn } = require("node:child_process");

/** Whitelist: only these commands may be spawned by project generation / open actions */
const SPAWN_WHITELIST = new Set(["claude", "node", "python", "git", "docker", "code"]);

/** Base directory for generated projects: ~/dw-brain/generated (or USERPROFILE on Windows) */
function getGeneratedBasePath() {
  const home = os.homedir();
  return path.join(home, "dw-brain", "generated");
}

function isPathUnderGenerated(targetPath) {
  const base = path.resolve(getGeneratedBasePath());
  const resolved = path.resolve(targetPath);
  return resolved === base || resolved.startsWith(base + path.sep);
}

/** Safe project name: alphanumeric, hyphen, underscore only */
function safeProjectName(name) {
  if (!name || typeof name !== "string") return "project";
  return name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "project";
}

/** Build prompt.md content that references spec files and lists requirements */
function buildPromptMd(projectName) {
  return `# 프로젝트 생성 지시

이 디렉터리에는 다음 스펙 파일들이 있습니다. 이 스펙을 기반으로 **현재 디렉터리**에 실제 프로젝트를 생성해 주세요.

## 참조 파일
- \`specPacket.json\` – 구조화된 스펙
- \`PRD.md\` – 제품 요구사항
- \`UX_FLOW.md\` – UX 플로우
- \`API_SPEC.md\` – API 스펙
- \`DB_SCHEMA.md\` – DB 스키마
- \`DECISIONS.md\` – 결정 사항

## 기술 요구사항 (반드시 준수)

### 프론트엔드
- **Nuxt 3** + **Tailwind CSS** + **Pinia**

### 백엔드
- **Python** + **FastAPI** + **Postgres**

### DB 마이그레이션
- **Alembic** 사용 (Prisma 아님, Python 표준)

### 인프라
- **docker-compose** 포함: 서비스 web / api / db
- **env.example** 포함

### 도메인
- 기본 CRUD: **Idea**, **Task**, **Document**, **User(roles)** 기준으로 생성

### API 문서
- **OpenAPI(Swagger)** 활성화

### 테스트
- 최소 2개: 백엔드 1개, 프론트엔드 1개

### 스크립트
- lint / typecheck / test 실행 스크립트 포함 (package.json 또는 Makefile 등)

---

프로젝트 이름: **${projectName}**
위 스펙과 요구사항에 맞춰 전체 프로젝트를 생성한 뒤, 여기 디렉터리에서 \`docker compose up\`, \`npm run dev\` 등으로 실행 가능한 상태로 완성해 주세요.
`;
}

let mainWindow = null;
let alwaysOnTop = true;
let miniMode = false;
let lastUnreadTotal = 0;

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
    height: 800,
    backgroundColor: "#0a0a0a",
    alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    },
    autoHideMenuBar: true
  });

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

  // target="_blank" / window.open() 링크를 앱 창 대신 시스템 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && typeof url === "string") shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 포커스 시 작업표시줄 깜빡임 해제
  mainWindow.on("focus", () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.flashFrame(false);
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

  // Electron does not implement getDisplayMedia by default; use desktopCapturer so
  // navigator.mediaDevices.getDisplayMedia() in the renderer works (e.g. screen share).
  // Without this handler, renderer gets "not supported" when calling getDisplayMedia.
  // Note: app must be fully restarted for main.cjs changes to take effect.
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer
      .getSources({ types: ["screen", "window"], thumbnailSize: { width: 0, height: 0 } })
      .then((sources) => {
        const src = sources.length ? sources[0] : null;
        if (src) callback({ video: src, audio: false });
        else callback();
      })
      .catch((err) => {
        console.error("desktopCapturer.getSources failed", err);
        callback();
      });
  });

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

  ipcMain.handle("setUnreadTotal", (_event, total) => {
    const n = typeof total === "number" && total > 0 ? Math.min(Math.floor(total), 999) : 0;
    lastUnreadTotal = n;
    if (process.platform === "darwin") app.setBadgeCount(n);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (n > 0 && !mainWindow.isFocused()) mainWindow.flashFrame(true);
      else if (n === 0) mainWindow.flashFrame(false);
    }
  });

  ipcMain.handle("saveZip", async (_event, arrayBuffer) => {
    if (!mainWindow) return { canceled: true };
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: "pulse-spec.zip",
      filters: [{ name: "ZIP", extensions: ["zip"] }]
    });
    if (canceled || !filePath) return { canceled: true };
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    return { canceled: false, filePath };
  });

  ipcMain.handle("openExternal", (_event, url) => {
    if (url && typeof url === "string") shell.openExternal(url);
    return { ok: true };
  });

  // --- Claude Code project generation (Electron only) ---
  ipcMain.handle("getGeneratedBasePath", () => getGeneratedBasePath());

  ipcMain.handle("checkClaudeCli", () => {
    if (!SPAWN_WHITELIST.has("claude")) return { available: false, error: "Command not allowed" };
    try {
      const { spawnSync } = require("node:child_process");
      const r = spawnSync("claude", ["-v"], { encoding: "utf8", timeout: 10000 });
      const ok = r.status === 0 && r.stdout && String(r.stdout).trim().length > 0;
      return { available: ok, version: ok ? String(r.stdout).trim() : null, error: r.error ? r.error.message : null };
    } catch (e) {
      return { available: false, error: e && e.message ? e.message : "claude not found" };
    }
  });

  ipcMain.handle("runClaudeCodeProjectGenerate", async (_event, payload) => {
    if (!mainWindow) return { success: false, error: "No window" };
    const { projectName: rawName, specPacket, documents } = payload || {};
    if (!specPacket || !documents) return { success: false, error: "Missing specPacket or documents" };

    const base = getGeneratedBasePath();
    try {
      fs.mkdirSync(base, { recursive: true });
    } catch (e) {
      return { success: false, error: "Failed to create base dir: " + (e.message || e) };
    }

    const safeName = safeProjectName(rawName || specPacket.project?.name || "project");
    const timestamp = Date.now();
    const workDir = path.join(base, `${timestamp}-${safeName}`);
    try {
      fs.mkdirSync(workDir, { recursive: true });
    } catch (e) {
      return { success: false, error: "Failed to create work dir: " + (e.message || e) };
    }

    const allowedExt = (name) => /\.(json|md)$/i.test(path.extname(name));
    const files = [
      ["specPacket.json", JSON.stringify(specPacket, null, 2)],
      ["PRD.md", documents.PRD || ""],
      ["UX_FLOW.md", documents.UX_FLOW || ""],
      ["API_SPEC.md", documents.API_SPEC || ""],
      ["DB_SCHEMA.md", documents.DB_SCHEMA || ""],
      ["DECISIONS.md", documents.DECISIONS || ""]
    ];
    for (const [name, content] of files) {
      if (!allowedExt(name)) continue;
      fs.writeFileSync(path.join(workDir, name), content, "utf8");
    }
    fs.writeFileSync(path.join(workDir, "prompt.md"), buildPromptMd(safeName), "utf8");

    if (!SPAWN_WHITELIST.has("claude")) {
      return { success: false, error: "claude is not in spawn whitelist", outPath: workDir };
    }

    const promptPath = path.join(workDir, "prompt.md");
    const promptStream = fs.createReadStream(promptPath, "utf8");

    const child = spawn("claude", [
      "-p",
      "Create the full-stack project according to the instructions and specification provided in stdin. Work in the current directory; spec files (specPacket.json, PRD.md, etc.) are already present."
    ], {
      cwd: workDir,
      stdio: ["pipe", "pipe", "pipe"]
    });

    promptStream.pipe(child.stdin);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("claude-code-stdout", String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("claude-code-stderr", String(chunk));
    });

    return new Promise((resolve) => {
      child.on("close", (code, signal) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("claude-code-done", { exitCode: code, signal, outPath: workDir });
        }
        resolve({ success: code === 0, exitCode: code, signal, outPath: workDir });
      });
      child.on("error", (err) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("claude-code-done", { exitCode: -1, error: err.message, outPath: workDir });
        }
        resolve({ success: false, error: err.message, outPath: workDir });
      });
    });
  });

  ipcMain.handle("openGeneratedFolder", (_event, dirPath) => {
    if (!dirPath || typeof dirPath !== "string") return { ok: false, error: "Invalid path" };
    if (!isPathUnderGenerated(dirPath)) return { ok: false, error: "Path must be under generated directory" };
    try {
      shell.openPath(dirPath).then((err) => {
        if (err && mainWindow) mainWindow.webContents.send("open-folder-result", { ok: !err, error: err });
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || e };
    }
  });

  ipcMain.handle("openInVSCode", (_event, dirPath) => {
    if (!dirPath || typeof dirPath !== "string") return { ok: false, error: "Invalid path" };
    if (!isPathUnderGenerated(dirPath)) return { ok: false, error: "Path must be under generated directory" };
    if (!SPAWN_WHITELIST.has("code")) return { ok: false, error: "code is not in spawn whitelist" };
    try {
      const child = spawn("code", [dirPath], { stdio: "ignore", detached: true });
      child.unref();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || e };
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

