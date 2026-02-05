import { defineStore } from "pinia";

declare global {
  interface Window {
    jarvisDesktop?: {
      getWindowState: () => Promise<{ alwaysOnTop: boolean; miniMode: boolean }>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      toggleMiniMode: () => Promise<boolean>;
    };
  }
}

export const useWindowStore = defineStore("window", {
  state: () => ({
    ready: false as boolean,
    alwaysOnTop: false as boolean,
    miniMode: false as boolean
  }),
  actions: {
    async init() {
      if (this.ready) return;
      this.ready = true;
      try {
        const s = await window.jarvisDesktop?.getWindowState?.();
        if (!s) return;
        this.alwaysOnTop = !!s.alwaysOnTop;
        this.miniMode = !!s.miniMode;
      } catch {
        // ignore
      }
    },

    async toggleAlwaysOnTop() {
      try {
        const v = await window.jarvisDesktop?.toggleAlwaysOnTop?.();
        if (typeof v === "boolean") this.alwaysOnTop = v;
      } catch {
        // ignore
      }
    },

    async toggleMiniMode() {
      try {
        const v = await window.jarvisDesktop?.toggleMiniMode?.();
        if (typeof v === "boolean") this.miniMode = v;
      } catch {
        // ignore
      }
    }
  }
});

