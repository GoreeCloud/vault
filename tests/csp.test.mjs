import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Vault browser CSP remains deny-by-default with no dynamic script execution", () => {
  const match = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(match, "CSP meta policy must exist");
  const policy = match[1];
  for (const directive of [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'"
  ]) {
    assert.ok(policy.split(";").map(x => x.trim()).includes(directive),
      "CSP must retain: " + directive);
  }
  assert.doesNotMatch(policy, /'unsafe-inline'|'unsafe-eval'|https?:\/\//i,
    "Do not grant execution or external network origins without explicit review");
  assert.match(html, /<meta\s+name="referrer"\s+content="no-referrer">/i);
  // frame-ancestors cannot be enforced by a CSP <meta> tag. This test
  // is NOT a substitute for hardened HTTP response headers (issue #22).
});

test("shipped document imports only its same-origin module without inline handlers", () => {
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
  assert.deepEqual(scripts, ['<script type="module" src="./src/app.mjs">']);
  assert.doesNotMatch(html, /\son(?:click|load|error|submit|input|change|focus|blur)\s*=/i,
    "Inline event handler attributes must not be introduced");
});
