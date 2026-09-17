export const MARKETING_THEME_STORAGE_KEY = "tanee-marketing-theme";

export const MARKETING_THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = window.localStorage.getItem("${MARKETING_THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.marketingTheme = theme;
  } catch (_) {
    document.documentElement.dataset.marketingTheme = "light";
  }
})();`;
