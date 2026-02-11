const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  getWindowState: () => ipcRenderer.invoke("getWindowState"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggleAlwaysOnTop"),
  toggleMiniMode: () => ipcRenderer.invoke("toggleMiniMode"),
  /** Save zip file via native save dialog. Pass ArrayBuffer of zip content. Returns { canceled: boolean, filePath?: string }. */
  saveZip: (arrayBuffer) => ipcRenderer.invoke("saveZip", arrayBuffer)
});
