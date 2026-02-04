const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jarvisDesktop", {
  toggleAlwaysOnTop: () => ipcRenderer.invoke("toggleAlwaysOnTop"),
  toggleMiniMode: () => ipcRenderer.invoke("toggleMiniMode")
});
