import { defineStore } from "pinia";

declare global {
  interface Window {
    jarvisDesktop?: {
      getWindowState: () => Promise<{ alwaysOnTop: boolean; miniMode: boolean }>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      toggleMiniMode: () => Promise<boolean>;
      saveZip?: (arrayBuffer: ArrayBuffer) => Promise<{ canceled: boolean; filePath?: string }>;
      openExternal?: (url: string) => Promise<{ ok: boolean }>;
      getGeneratedBasePath?: () => Promise<string>;
      checkClaudeCli?: () => Promise<{ available: boolean; version?: string | null; error?: string | null }>;
      runClaudeCodeProjectGenerate?: (payload: {
        projectName: string;
        specPacket: unknown;
        documents: Record<string, string>;
      }) => Promise<{ success: boolean; exitCode?: number; outPath?: string; error?: string }>;
      onClaudeCodeStdout?: (cb: (chunk: string) => void) => () => void;
      onClaudeCodeStderr?: (cb: (chunk: string) => void) => () => void;
      onClaudeCodeDone?: (cb: (data: { exitCode?: number; outPath?: string; error?: string }) => void) => () => void;
      openGeneratedFolder?: (dirPath: string) => Promise<{ ok: boolean; error?: string }>;
      openInVSCode?: (dirPath: string) => Promise<{ ok: boolean; error?: string }>;
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

