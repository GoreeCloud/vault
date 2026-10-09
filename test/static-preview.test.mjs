import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../preview/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../preview/styles.css", import.meta.url), "utf8");

test("preview never contains credential entry or executable forms", () => {
  assert.doesNotMatch(html, /<\s*(?:form|input|textarea|select|button|script|iframe|object|embed)\b/i);
  assert.doesNotMatch(html, /\bon(?:load|click|change|submit|error)\s*=/i);
  assert.match(html, /script-src 'none'/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
});

test("offline preview has no remote dependencies or dynamic storage", () => {
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /\b(?:localStorage|indexedDB|sessionStorage|fetch|XMLHttpRequest|WebSocket)\b/i);
  assert.doesNotMatch(css, /@import\b|\burl\s*\(/i);
  assert.ok(html.includes('href="./styles.css"'));
  assert.ok(html.includes('default-src \'none\''));
});

test("preview labels every planned feature and unavailable security gate", () => {
  for (const label of ["NOT A WORKING PASSWORD MANAGER","Do not provide secrets",
      "Human security acceptance remains open", "Not implemented", "Not accepted",
      "Illustrative only", "Planned"]) {
    assert.ok(html.toLowerCase().includes(label.toLowerCase()), "Missing "+label);
  }
  assert.equal((html.match(/class="tag">Planned/g) ?? []).length, 4);
});

test("preview has correct landmarks, linked headings and keyboard skip target", () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /class="skip" href="#main"/);
  assert.match(html, /<nav aria-label="Sections">/);
  for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(html.includes('id="'+id+'"'), "Missing anchor "+id);
  }
  for (const [,id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
    assert.ok(html.includes('id="'+id+'"'), "Missing label "+id);
  }
});

test("visual stylesheet has focus, responsive reflow and accessibility adaptations", () => {
  for (const token of [":focus-visible","@media(max-width:820px)","@media(max-width:540px)",
     "prefers-reduced-motion:reduce","forced-colors:active","prefers-color-scheme:light",
     "grid-template-columns:1fr","minmax(0,1fr)"]) {
    assert.ok(css.includes(token), "Missing CSS requirement "+token);
  }
  assert.ok(css.length > 2500, "Prevent return to unstyled single-rule placeholder");
});

test("light and dark nav hover and focus colors meet minimum text contrast", () => {
  assert.ok(css.includes(".rail nav a:hover,.rail nav a:focus-visible{background:var(--nav-hover)}"));
  const dark = css.match(/:root\{([\s\S]*?)\}/)?.[1];
  const light = css.match(/@media\(prefers-color-scheme:light\)\{\s*:root\{([^}]+)\}/)?.[1];
  assert.ok(dark && light, "both theme variable sets must exist");
  const get = (text, key) => {
    const value = text.match(new RegExp("--" + key + ":(#[0-9a-f]{6})"))?.[1];
    assert.ok(value, "missing theme variable " + key);
    return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  };
  const luminance = rgb => rgb.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const ratio = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const theme of [dark, light]) {
    assert.ok(ratio(get(theme, "text"), get(theme, "nav-hover")) >= 4.5,
      "navigation hover and keyboard focus text contrast must be at least 4.5:1");
  }
});

test("feature icon foreground and background meet minimum contrast in both themes", () => {
  assert.ok(css.includes("background:var(--tile-bg);color:var(--tile-ink)"));
  const themes = [
    css.match(/:root\{([\s\S]*?)\}/)?.[1],
    css.match(/@media\(prefers-color-scheme:light\)\{\s*:root\{([^}]+)\}/)?.[1]
  ];
  const color = (theme, key) => {
    const hex = theme?.match(new RegExp("--" + key + ":(#[0-9a-f]{6})"))?.[1];
    assert.ok(hex, "Missing " + key);
    return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  };
  const luminance = rgb => rgb.map(v => v <= 0.04045 ?
    v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0);
  for (const theme of themes) {
    const lightness = [color(theme, "tile-bg"), color(theme, "tile-ink")]
      .map(luminance).sort((a, b) => b - a);
    const contrast = (lightness[0] + 0.05) / (lightness[1] + 0.05);
    assert.ok(contrast >= 4.5, "Icon contrast below 4.5:1: " + contrast);
  }
});

test("preview small labels remain legible without changing safety constraints", () => {
  for (const token of ["font-size:12px", "font-size:13px", "font-size:14px"]) {
    assert.ok(css.includes(token), "Missing readable preview type scale " + token);
  }
  assert.doesNotMatch(html, /<\s*(form|input|textarea|script)\b/i);
});
