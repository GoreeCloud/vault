import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { startPreviewServer, PREVIEW_CSP } from "../scripts/preview.mjs";

function rawRequest(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({
      host: "127.0.0.1",
      port,
      path,
      method: options.method ?? "GET",
      headers: options.headers ?? {}
    }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.once("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    req.once("error", reject);
    req.end();
  });
}

test("local preview serves only allowed assets with defensive response headers", async () => {
  const server = await startPreviewServer(0);
  try {
    const { address, port } = server.address();
    assert.equal(address, "127.0.0.1", "must not bind to a public/LAN interface");
    const routes = [
      ["/", "text/html"],
      ["/index.html", "text/html"],
      ["/styles.css", "text/css"],
      ["/src/app.mjs", "text/javascript"],
      ["/src/crypto.mjs", "text/javascript"]
    ];
    for (const [path, type] of routes) {
      const response = await rawRequest(port, path);
      assert.equal(response.status, 200, path);
      assert.ok(response.headers["content-type"].startsWith(type));
      assert.ok(response.body.length > 50);
      assert.equal(response.headers["cache-control"], "no-store");
      assert.equal(response.headers["x-frame-options"], "DENY");
      assert.equal(response.headers["x-content-type-options"], "nosniff");
      assert.equal(response.headers["referrer-policy"], "no-referrer");
      assert.equal(response.headers["cross-origin-resource-policy"], "same-origin");
      assert.equal(response.headers["cross-origin-opener-policy"], "same-origin");
      assert.equal(response.headers["content-security-policy"], PREVIEW_CSP);
      assert.match(PREVIEW_CSP, /frame-ancestors 'none'/);
      assert.match(PREVIEW_CSP, /connect-src 'none'/);
      assert.doesNotMatch(PREVIEW_CSP, /unsafe-inline|unsafe-eval/);
    }
    const head = await rawRequest(port, "/index.html", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    assert.ok(Number(head.headers["content-length"]) > 100);

    const post = await rawRequest(port, "/index.html", { method: "POST" });
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, "GET, HEAD");

    for (const path of [
      "/README.md", "/package.json", "/docs/FEATURES.md", "/.git/config",
      "/tests/crypto.test.mjs", "/src/not-listed.mjs", "/src/../README.md",
      "/src/%2e%2e/README.md", "/index.html?x=1", "/src/app.mjs?x=1"
    ]) {
      const denied = await rawRequest(port, path);
      assert.equal(denied.status, 404, path);
      assert.equal(denied.headers["cache-control"], "no-store");
    }

    const poisoned = await rawRequest(port, "/", { headers: { Host: "untrusted.example" } });
    assert.equal(poisoned.status, 403, "reject non-loopback Host (DNS rebinding)");
    assert.doesNotMatch(poisoned.body, /GoreeCloud Vault/);
  } finally {
    await new Promise(resolveClose => server.close(resolveClose));
  }
});

test("local preview rejects invalid ports before binding", async () => {
  for (const port of [-1, 65536, "4173", 0.5, NaN]) {
    await assert.rejects(startPreviewServer(port), RangeError);
  }
});
