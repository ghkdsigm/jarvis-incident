const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("screenSharePopup", {
  ready: () => ipcRenderer.send("screen-share-popup-ready"),
  onOffer: (cb) => {
    const fn = (_e, sdp) => cb(sdp);
    ipcRenderer.on("screen-share-offer", fn);
    return () => ipcRenderer.removeListener("screen-share-offer", fn);
  },
  sendAnswer: (sdp) => ipcRenderer.send("screen-share-answer", sdp),
  onIce: (cb) => {
    const fn = (_e, candidate) => cb(candidate);
    ipcRenderer.on("screen-share-ice", fn);
    return () => ipcRenderer.removeListener("screen-share-ice", fn);
  },
  sendIce: (candidate) => ipcRenderer.send("screen-share-ice", candidate)
});
