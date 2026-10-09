import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request } from "node:http";
import { createPreviewServer } from "../tools/serve-preview.mjs";

async function withServer(run) {
  const server = createPreviewServer();
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = server.address().port;
    await run(port);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
function get(port, path, method = "GET", extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: "127.0.0.1", port, method, path, headers: extraHeaders }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.once("error", reject);
    req.end();
  });
}

test("loopback development preview serves only read-only files with security headers", async () => {
  await withServer(async port => {
    const html = await get(port, "/");
    const css = await get(port, "/styles.css");
    assert.equal(html.status, 200);
    assert.equal(css.status, 200);
    assert.match(html.body, /NOT A WORKING PASSWORD MANAGER/);
    assert.match(css.body, /prefers-reduced-motion/);
    assert.match(html.headers["content-type"], /^text\/html/);
    assert.match(css.headers["content-type"], /^text\/css/);
    for (const response of [html, css]) {
      const csp = response.headers["content-security-policy"];
      for (const rule of ["default-src 'none'", "script-src 'none'", "connect-src 'none'",
        "form-action 'none'", "base-uri 'none'", "frame-ancestors 'none'"]) {
        assert.ok(csp.includes(rule), `Missing ${rule}`);
      }
      assert.equal(response.headers["x-frame-options"], "DENY");
      assert.equal(response.headers["x-content-type-options"], "nosniff");
      assert.equal(response.headers["referrer-policy"], "no-referrer");
      assert.equal(response.headers["cross-origin-resource-policy"], "same-origin");
      assert.match(response.headers["cache-control"], /no-store/);
      assert.equal(response.headers["access-control-allow-origin"], undefined);
      assert.equal(response.headers["set-cookie"], undefined);
    }
  });
});

test("preview rejects every unknown or traversal route without leaking filesystem paths", async () => {
  await withServer(async port => {
    for (const path of ["/robots.txt", "/../package.json", "/%2e%2e/package.json",
      "/?path=../../package.json", "/.env", "/tools/serve-preview.mjs", "/styles.css?x=1"]) {
      const response = await get(port, path);
      assert.equal(response.status, 404, path);
      assert.equal(response.body, "Not found");
      assert.doesNotMatch(response.body, /\/home\/|\/mnt\/|\.env|package.json/);
    }
  });
});

test("preview allows HEAD but rejects mutation methods", async () => {
  await withServer(async port => {
    const head = await get(port, "/", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = await get(port, "/", method);
      assert.equal(response.status, 405, method);
      assert.equal(response.headers.allow, "GET, HEAD");
      assert.equal(response.body, "Method not allowed");
    }
  });
});

test("preview refuses non-loopback Host headers and never redirects", async () => {
  await withServer(async port => {
    for (const host of ["evil.example", "localhost", "127.0.0.1:1", "0.0.0.0"]) {
      const response = await get(port, "/", "GET", { Host: host });
      assert.equal(response.status, 403, host);
      assert.equal(response.headers.location, undefined);
    }
    const good = await get(port, "/index.html");
    assert.equal(good.status, 200);
  });
});
