/**
 * GoreeCloud Vault pre-alpha local static preview.
 * This is not an authenticated API or production hosting service.
 * It binds to loopback and serves only explicitly listed web assets.
 */
import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const MIME = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8"
};
const ROUTES = new Map([
  ["/", ["index.html", MIME.html]],
  ["/index.html", ["index.html", MIME.html]],
  ["/styles.css", ["styles.css", MIME.css]],
  ...["app", "crypto", "security", "storage", "recovery", "rekey", "theme", "health"].map(
    name => ["/src/" + name + ".mjs", ["src/" + name + ".mjs", MIME.js]]
  )
]);

export const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

const HEADERS = Object.freeze({
  "Content-Security-Policy": PREVIEW_CSP,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cache-Control": "no-store"
});

function reject(response, code, message, headOnly = false, extraHeaders = {}) {
  response.writeHead(code, {
    ...HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    ...extraHeaders
  });
  response.end(headOnly ? undefined : message);
}

export function createPreviewServer() {
  const server = createServer(async (request, response) => {
    // Restrict Host to the literal loopback endpoint to reduce DNS-rebinding
    // access by untrusted pages on the same machine.
    const expectedHost = HOST + ":" + server.address()?.port;
    if (request.headers.host !== expectedHost) {
      reject(response, 403, "Forbidden.");
      return;
    }

    const headOnly = request.method === "HEAD";
    if (request.method !== "GET" && !headOnly) {
      reject(response, 405, "Method not allowed.", false, { Allow: "GET, HEAD" });
      return;
    }

    // Match exact raw request paths. Unknown, encoded, parameterized and
    // traversal-like paths are never decoded into a filesystem pathname.
    const route = ROUTES.get(request.url);
    if (!route) {
      reject(response, 404, "Not found.", headOnly);
      return;
    }
    try {
      const actualRoot = await realpath(ROOT);
      const target = await realpath(join(ROOT, route[0]));
      if (!target.startsWith(actualRoot + sep)) throw Error("Unlisted real path.");
      const bytes = await readFile(target);
      response.writeHead(200, {
        ...HEADERS,
        "Content-Type": route[1],
        "Content-Length": bytes.length
      });
      response.end(headOnly ? undefined : bytes);
    } catch {
      // Do not disclose local paths, filesystem errors, or source content.
      reject(response, 404, "Not found.", headOnly);
    }
  });
  return server;
}

export async function startPreviewServer(port = 4173) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError("Invalid local preview port.");
  }
  const server = createPreviewServer();
  await new Promise((resolveReady, rejectReady) => {
    const onError = error => rejectReady(error);
    server.once("error", onError);
    server.listen(port, HOST, () => {
      server.off("error", onError);
      resolveReady();
    });
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startPreviewServer().then(() => {
    process.stdout.write("GoreeCloud Vault preview: http://127.0.0.1:4173\n");
    process.stdout.write("Pre-alpha only. Do not use real credentials or expose this preview.\n");
  }).catch(error => {
    process.stderr.write("Could not start local preview: " + error.message + "\n");
    process.exitCode = 1;
  });
}
