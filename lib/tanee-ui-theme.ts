export type TaneeUiTheme = "light" | "dark";

export const TANEE_UI_THEME_STORAGE_KEY = "tanee-theme";
export const LEGACY_MARKETING_THEME_STORAGE_KEY = "tanee-marketing-theme";
export const TANEE_UI_THEME_CHANGE_EVENT = "tanee:theme-change";

export const TANEE_UI_THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = window.localStorage.getItem("${TANEE_UI_THEME_STORAGE_KEY}");
    if (stored !== "light" && stored !== "dark") {
      stored = window.localStorage.getItem("${LEGACY_MARKETING_THEME_STORAGE_KEY}");
    }
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.dataset.marketingTheme = theme;
    window.localStorage.setItem("${TANEE_UI_THEME_STORAGE_KEY}", theme);
  } catch (_) {
    var root = document.documentElement;
    root.classList.remove("dark");
    root.dataset.theme = "light";
    root.dataset.marketingTheme = "light";
  }
})();`;

export function getCurrentTaneeUiTheme(): TaneeUiTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTaneeUiTheme(theme: TaneeUiTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.dataset.marketingTheme = theme;
  window.localStorage.setItem(TANEE_UI_THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event(TANEE_UI_THEME_CHANGE_EVENT));
}
