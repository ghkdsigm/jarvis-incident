const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  getWindowState: () => ipcRenderer.invoke("getWindowState"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggleAlwaysOnTop"),
  toggleMiniMode: () => ipcRenderer.invoke("toggleMiniMode")
});
