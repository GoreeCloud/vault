import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTheme, nextTheme, resolvedTheme, installTheme, THEME_KEY } from "../src/theme.mjs";

test("appearance preferences follow the system and cycle deterministically", () => {
  assert.equal(normalizeTheme("bogus"), "system");
  assert.equal(resolvedTheme("system", true), "dark");
  assert.equal(resolvedTheme("system", false), "light");
  assert.equal(resolvedTheme("light", true), "light");
  assert.equal(nextTheme("system"), "light");
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "system");
});

test("theme controller changes the visual mode without vault data", () => {
  let stored = null;
  const eventListeners = new Map();
  const buttonListeners = new Map();
  const root = { dataset: {}, style: {} };
  const button = {
    dataset: {}, textContent: "",
    attributes: {},
    setAttribute(key, val) { this.attributes[key] = val; },
    addEventListener(event, fn) { buttonListeners.set(event, fn); },
    removeEventListener(event) { buttonListeners.delete(event); }
  };
  const media = { matches: true, addEventListener(name, fn) { eventListeners.set("media", fn); },
    removeEventListener() { eventListeners.delete("media"); } };
  const windowObject = {
    addEventListener(name, fn) { eventListeners.set(name, fn); },
    removeEventListener(name) { eventListeners.delete(name); }
  };
  const storage = {
    getItem(key) { assert.equal(key, THEME_KEY); return stored; },
    setItem(key, value) { assert.equal(key, THEME_KEY); stored = value; }
  };
  const controller = installTheme({ root, buttons: [button], media, windowObject, storage });
  assert.equal(root.dataset.theme, "dark");
  buttonListeners.get("click")();
  assert.equal(root.dataset.theme, "light");
  assert.equal(stored, "light");
  buttonListeners.get("click")();
  assert.equal(root.dataset.theme, "dark");
  buttonListeners.get("click")();
  assert.equal(root.dataset.theme, "dark");
  media.matches = false;
  eventListeners.get("media")();
  assert.equal(root.dataset.theme, "light");
  eventListeners.get("storage")({ key: THEME_KEY, newValue: "dark" });
  assert.equal(root.dataset.theme, "dark");
  assert.equal(root.style.colorScheme, "dark");
  controller.destroy();
  assert.equal(buttonListeners.size, 0);
});
