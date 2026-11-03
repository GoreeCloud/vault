/**
 * GoreeCloud Vault appearance preferences.
 * Public, non-sensitive display preference; never stores vault content or keys.
 * GC UI appearance is independent from palette selection.
 */
export const THEME_KEY = "goreecloud.vault.appearance.v1";
const ORDER = ["system", "light", "dark"];

export function normalizeTheme(value) {
  return ORDER.includes(value) ? value : "system";
}

export function resolvedTheme(preference, systemDark) {
  const mode = normalizeTheme(preference);
  return mode === "system" ? (systemDark ? "dark" : "light") : mode;
}

export function nextTheme(preference) {
  return ORDER[(ORDER.indexOf(normalizeTheme(preference)) + 1) % ORDER.length];
}

export function installTheme({
  root = document.documentElement,
  buttons = [...document.querySelectorAll("[data-theme-toggle]")],
  storage = localStorage,
  windowObject = window,
  media = window.matchMedia("(prefers-color-scheme: dark)")
} = {}) {
  let preference = "system";
  try { preference = normalizeTheme(storage.getItem(THEME_KEY)); }
  catch { /* Storage may be disabled; follow operating system without persistence. */ }

  const apply = () => {
    const actual = resolvedTheme(preference, media.matches);
    root.dataset.theme = actual;
    root.style.colorScheme = actual;
    for (const button of buttons) {
      const shown = preference[0].toUpperCase() + preference.slice(1);
      const next = nextTheme(preference);
      button.textContent = "Appearance: " + shown;
      button.setAttribute("aria-label", "Appearance " + shown + ". Switch to " + next + " mode.");
      button.dataset.mode = preference;
    }
  };
  const change = () => {
    preference = nextTheme(preference);
    try { storage.setItem(THEME_KEY, preference); }
    catch { /* Appearance continues for this tab only. */ }
    apply();
  };
  const fromStorage = event => {
    if (event.key !== THEME_KEY) return;
    preference = normalizeTheme(event.newValue);
    apply();
  };
  for (const button of buttons) button.addEventListener("click", change);
  media.addEventListener?.("change", apply);
  windowObject.addEventListener?.("storage", fromStorage);
  apply();
  return {
    get preference() { return preference; },
    destroy() {
      for (const button of buttons) button.removeEventListener("click", change);
      media.removeEventListener?.("change", apply);
      windowObject.removeEventListener?.("storage", fromStorage);
    }
  };
}
