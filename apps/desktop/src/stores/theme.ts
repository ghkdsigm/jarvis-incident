import { defineStore } from "pinia";
import { getStoredTheme, setTheme as applyAndPersistTheme, getActiveTheme, type ThemeMode } from "../theme";

export const useThemeStore = defineStore("theme", {
  state: () => ({
    theme: "dark" as ThemeMode
  }),

  getters: {
    isDark(): boolean {
      return this.theme === "dark";
    }
  },

  actions: {
    init() {
      const stored = getStoredTheme();
      const mode = stored ?? "dark";
      applyAndPersistTheme(mode);
      this.theme = getActiveTheme();
    },

    setTheme(mode: ThemeMode) {
      applyAndPersistTheme(mode);
      this.theme = getActiveTheme();
    },

    toggle() {
      const next: ThemeMode = this.theme === "dark" ? "light" : "dark";
      this.setTheme(next);
    }
  }
});
