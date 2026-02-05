export type ThemeMode = "dark" | "light";

const LS_THEME = "jarvis.desktop.theme";

export function getStoredTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(LS_THEME);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function getActiveTheme(): ThemeMode {
  const v = document.documentElement.dataset.theme;
  return v === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: ThemeMode) {
  applyTheme(theme);
  try {
    localStorage.setItem(LS_THEME, theme);
  } catch {
    // ignore
  }
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getActiveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function initTheme(defaultTheme: ThemeMode = "dark") {
  const stored = getStoredTheme();
  applyTheme(stored ?? defaultTheme);
}

