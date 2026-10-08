import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

// Local-only, read-only development preview. This is not a Vault backend.
const htmlPath = fileURLToPath(new URL("../preview/index.html", import.meta.url));
const cssPath = fileURLToPath(new URL("../preview/styles.css", import.meta.url));
const assets = new Map([
  ["/", [htmlPath, "text/html; charset=utf-8"]],
  ["/index.html", [htmlPath, "text/html; charset=utf-8"]],
  ["/styles.css", [cssPath, "text/css; charset=utf-8"]]
]);
const headers = {
  "Content-Security-Policy": "default-src 'none'; style-src 'self'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cache-Control": "no-store"
};
export function createPreviewServer() {
  const server = createServer(async (req, res) => {
    const method = req.method;
    const port = server.address()?.port;
    let status = 200, body = null, type = "text/plain; charset=utf-8";
    if (req.headers.host !== "127.0.0.1:" + port) status = 403;
    else if (method !== "GET" && method !== "HEAD") status = 405;
    else if (!assets.has(req.url)) status = 404;
    else {
      const [file, mime] = assets.get(req.url);
      try { body = await readFile(file); type = mime; }
      catch { status = 404; }
    }
    if (!body) body = Buffer.from(status === 403 ? "Forbidden" :
      status === 405 ? "Method not allowed" : "Not found");
    res.writeHead(status, {...headers, "Content-Type": type,
      "Content-Length": body.byteLength,
      ...(status === 405 ? { Allow: "GET, HEAD" } : {})});
    res.end(method === "HEAD" ? undefined : body);
  });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portText = process.env.GOREECLOUD_VAULT_PREVIEW_PORT ?? "8765";
  const port = Number(portText);
  if (!/^[0-9]+$/.test(portText) || !Number.isSafeInteger(port) ||
      port < 1024 || port > 65535) throw new Error("Invalid preview port");
  createPreviewServer().listen(port, "127.0.0.1", () => {
    process.stdout.write("Development-only static preview: http://127.0.0.1:" + port + "/\n");
  });
}
