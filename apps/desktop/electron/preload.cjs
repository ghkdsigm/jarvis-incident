const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  getWindowState: () => ipcRenderer.invoke("getWindowState"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggleAlwaysOnTop"),
  toggleMiniMode: () => ipcRenderer.invoke("toggleMiniMode"),
  /** 알림: 읽지 않음 개수 전달. 작업표시줄 배지/깜빡임에 사용. */
  setUnreadTotal: (total) => ipcRenderer.invoke("setUnreadTotal", total),
  /** Save zip file via native save dialog. Pass ArrayBuffer of zip content. Returns { canceled: boolean, filePath?: string }. */
  saveZip: (arrayBuffer) => ipcRenderer.invoke("saveZip", arrayBuffer),
  /** Open URL in the system's default browser (e.g. chat message links). */
  openExternal: (url) => ipcRenderer.invoke("openExternal", url),

  // Claude Code project generation (Electron only)
  getGeneratedBasePath: () => ipcRenderer.invoke("getGeneratedBasePath"),
  checkClaudeCli: () => ipcRenderer.invoke("checkClaudeCli"),
  runClaudeCodeProjectGenerate: (payload) => ipcRenderer.invoke("runClaudeCodeProjectGenerate", payload),
  onClaudeCodeStdout: (cb) => {
    const fn = (_e, chunk) => cb(chunk);
    ipcRenderer.on("claude-code-stdout", fn);
    return () => ipcRenderer.removeListener("claude-code-stdout", fn);
  },
  onClaudeCodeStderr: (cb) => {
    const fn = (_e, chunk) => cb(chunk);
    ipcRenderer.on("claude-code-stderr", fn);
    return () => ipcRenderer.removeListener("claude-code-stderr", fn);
  },
  onClaudeCodeDone: (cb) => {
    const fn = (_e, data) => cb(data);
    ipcRenderer.on("claude-code-done", fn);
    return () => ipcRenderer.removeListener("claude-code-done", fn);
  },
  openGeneratedFolder: (dirPath) => ipcRenderer.invoke("openGeneratedFolder", dirPath),
  openInVSCode: (dirPath) => ipcRenderer.invoke("openInVSCode", dirPath)
});
