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
