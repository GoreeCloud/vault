import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../preview/styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../preview/index.html", import.meta.url), "utf8");

const luminance = hex => {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
};
const contrast = (one, two) => {
  const values = [luminance(one), luminance(two)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
const property = (source, selector, name) => {
  const rule = source.match(new RegExp("\\." + selector + "\\{([^}]*)\\}"))?.[1];
  assert.ok(rule, "Missing selector: " + selector);
  const value = rule.match(new RegExp("(?:^|;)" + name + ":(#[0-9a-f]{6})", "i"))?.[1];
  assert.ok(value, "Missing " + name + " for " + selector);
  return value;
};

test("notice icon contrast meets 4.5:1 in light and dark themes", () => {
  const boundary = "@media(prefers-color-scheme:light){";
  assert.equal(css.split(boundary).length, 2, "Expected light-theme boundary");
  const [dark, light] = css.split(boundary);
  for (const theme of [dark, light]) {
    const icon = property(theme, "notice-icon", "color");
    const background = property(theme, "notice", "background");
    assert.ok(contrast(icon, background) >= 4.5, "Warning icon below 4.5:1");
  }
});

test("warning remains accessible as text independent of decorative icon", () => {
  assert.match(html, /<section class="notice" aria-labelledby="warning">/);
  assert.match(html, /<span class="notice-icon" aria-hidden="true">!<\/span>/);
  assert.match(html, /<h2 id="warning">Do not provide secrets<\/h2>/);
});
