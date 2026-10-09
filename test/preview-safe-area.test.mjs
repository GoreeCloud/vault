import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../preview/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../preview/styles.css", import.meta.url), "utf8");

test("static preview opts into viewport-fit and protects all four system insets", () => {
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  for (const axis of ["top", "bottom", "left", "right"]) {
    assert.ok(css.includes("env(safe-area-inset-" + axis + ",0px)"),
      "Missing " + axis + " device inset");
  }
  assert.match(css, /min-height:calc\(100dvh - env\(safe-area-inset-top,0px\) - env\(safe-area-inset-bottom,0px\)\)/);
});

test("safe inset rules protect actual content, not just background paint", () => {
  assert.match(css, /body\{[^}]*padding-block-start:env\(safe-area-inset-top,0px\)/);
  assert.match(css, /body\{[^}]*padding-block-end:env\(safe-area-inset-bottom,0px\)/);
  assert.match(css, /body\{[^}]*padding-inline-start:env\(safe-area-inset-left,0px\)/);
  assert.match(css, /body\{[^}]*padding-inline-end:env\(safe-area-inset-right,0px\)/);
  assert.match(css, /\.skip:focus\{top:calc\(env\(safe-area-inset-top,0px\) \+ 8px\)\}/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.doesNotMatch(html, /<\s*(input|form|script)\b/i);
});
