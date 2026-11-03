// GoreeCloud Vault — browser smoke audit (test-only, no real secrets)
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
const root = process.cwd();
const chromePath = process.env.CHROME_BIN;
if (!chromePath || !existsSync(chromePath)) throw Error("Set CHROME_BIN to an inspected, installed Chromium binary.");
const pause = ms => new Promise(done => setTimeout(done, ms));
const workspace = await mkdtemp(join(tmpdir(), "gc-vault-browser-"));
const server = createServer(async (req, res) => {
  let path;
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    path = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (path !== root && !path.startsWith(root + sep)) throw Error("Denied path.");
    const bytes = await readFile(path);
    res.setHeader("Content-Type", { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" }[extname(path)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(bytes);
  } catch { res.statusCode = 404; res.end("Not found."); }
});
let chrome, ws, ws2;
try {
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  const port = server.address().port;
  chrome = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
    "--no-first-run", "--no-default-browser-check",
    "--user-data-dir=" + join(workspace, "profile"), "--remote-debugging-port=0",
    "about:blank"
  ], { stdio: "ignore" });
  const active = join(workspace, "profile", "DevToolsActivePort");
  let debugging;
  for (let i = 0; i < 80; i++) {
    if (existsSync(active)) {
      debugging = Number((await readFile(active, "utf8")).split("\n")[0]);
      break;
    }
    if (chrome.exitCode !== null) throw Error("Chromium exited before startup.");
    await pause(100);
  }
  if (!debugging) throw Error("Chrome debugging endpoint unavailable.");
  const tabs = await (await fetch("http://127.0.0.1:" + debugging + "/json/list")).json();
  const target = tabs.find(v => v.type === "page");
  if (!target?.webSocketDebuggerUrl) throw Error("No browser page target.");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", fail, { once: true });
  });
  let sequence = 0;
  const inflight = new Map();
  const exceptions = [];
  ws.addEventListener("message", event => {
    const packet = JSON.parse(event.data);
    if (packet.id) {
      const waiter = inflight.get(packet.id);
      if (waiter) {
        inflight.delete(packet.id);
        packet.error ? waiter.reject(Error(packet.error.message)) : waiter.resolve(packet.result);
      }
    } else if (packet.method === "Runtime.exceptionThrown") {
      exceptions.push(packet.params.exceptionDetails?.text || "Unhandled browser exception");
    } else if (packet.method === "Page.javascriptDialogOpening") {
      void send("Page.handleJavaScriptDialog", { accept: true });
    }
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      inflight.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function script(expression) {
    const result = await send("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true,
      userGesture: true
    });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function until(expression, label, timeout = 8000) {
    for (let i = 0; i < timeout / 100; i++) {
      if (await script(expression)) return;
      await pause(100);
    }
    throw Error("Timed out: " + label);
  }
  async function screenshot(name) {
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(join(workspace, name + ".png"), Buffer.from(result.data, "base64"));
  }
  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/" });
  await until("document.readyState==='complete' && document.getElementById('auth-action')!==null", "initial auth screen");
  assert.equal(await script("document.getElementById('create-confirm-group').hidden"), false);
  await screenshot("01-create-vault");
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('create-confirm').value='mismatched-only-test-passphrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('auth-message').textContent.includes('do not match')", "first run mismatch rejection");
  assert.equal(await script("document.getElementById('app-screen').hidden"), true);
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('create-confirm').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden === false", "create new vault");
  assert.equal(await script("document.getElementById('item-list').children.length"), 1);
  await screenshot("02-empty-workspace");
  await script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Browser fixture login'; document.getElementById('edit-username').value='fixture-user'; document.getElementById('edit-password').value='dummy-only-do-not-use'; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('editor-dialog').open===false && document.getElementById('item-count').textContent.startsWith('1 of')", "first encrypted save");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1').includes('dummy-only-do-not-use')"), false);
  await screenshot("03-item-details");
  const encryptedOriginal = await script("localStorage.getItem('goreecloud.vault.encrypted.v1')");
  const backupPath = join(workspace, "validated-test-backup.json");
  await writeFile(backupPath, encryptedOriginal, "utf8");
  await script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Temporary item'; document.getElementById('edit-password').value='test-value'; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('item-count').textContent.startsWith('2 of')", "second item saved");
  await script("document.getElementById('lock-vault').click()");
  await until("document.getElementById('auth-screen').hidden===false", "manual lock");
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden===false && document.getElementById('item-count').textContent.startsWith('2 of')", "unlock retained items");
  await script("document.getElementById('lock-vault').click()");
  const dom = await send("DOM.getDocument", { depth: 1 });
  const fileInput = await send("DOM.querySelector", { nodeId: dom.root.nodeId, selector: "#import-file" });
  await send("DOM.setFileInputFiles", { nodeId: fileInput.nodeId, files: [backupPath] });
  await until("document.getElementById('restore-dialog').open===true", "restore dialog opens");
  await script("document.getElementById('restore-passphrase').value='wrong-backup-passphrase'; document.getElementById('restore-form').requestSubmit()");
  await until("document.getElementById('restore-message').textContent.includes('Backup not imported')", "wrong password rejected");
  assert.equal(await script("document.getElementById('restore-dialog').open"), true);
  await script("document.getElementById('restore-passphrase').value='test-only secure browser phrase'; document.getElementById('restore-form').requestSubmit()");
  await until("document.getElementById('restore-dialog').open===false && document.getElementById('auth-message').textContent.includes('verified and restored')", "verified backup replaced local storage");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), encryptedOriginal);
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden === false && document.getElementById('item-count').textContent.startsWith('1 of')", "restored one-item backup");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await script("document.documentElement.scrollWidth <= window.innerWidth"), true, "mobile layout must not scroll sideways");
  assert.equal(await script("Math.abs(document.querySelector('.sidebar .nav-stack').getBoundingClientRect().bottom - window.innerHeight) <= 2"), true, "mobile nav stays at bottom of viewport");
  await screenshot("04-mobile-workspace");

  // Simultaneous editing in two real Chromium tabs with shared origin and
  // browser profile. One save must win; the stale tab must lock/fail closed.
  const secondTarget = await send("Target.createTarget", { url: "http://127.0.0.1:" + port + "/" });
  const currentTabs = await (await fetch("http://127.0.0.1:" + debugging + "/json/list")).json();
  const secondTab = currentTabs.find(tab => tab.id === secondTarget.targetId);
  if (!secondTab?.webSocketDebuggerUrl) throw Error("Second browser tab could not be inspected.");
  ws2 = new WebSocket(secondTab.webSocketDebuggerUrl);
  await new Promise((ok, fail) => {
    ws2.addEventListener("open", ok, { once: true });
    ws2.addEventListener("error", fail, { once: true });
  });
  const inflight2 = new Map();
  let sequence2 = 0;
  ws2.addEventListener("message", event => {
    const packet = JSON.parse(event.data);
    if (packet.id) {
      const waiter = inflight2.get(packet.id);
      if (waiter) {
        inflight2.delete(packet.id);
        packet.error ? waiter.reject(Error(packet.error.message)) : waiter.resolve(packet.result);
      }
    } else if (packet.method === "Runtime.exceptionThrown") {
      exceptions.push(packet.params.exceptionDetails?.text || "Unhandled second-tab exception");
    }
  });
  function send2(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence2;
      inflight2.set(id, { resolve, reject });
      ws2.send(JSON.stringify({ id, method, params }));
    });
  }
  async function script2(expression) {
    const result = await send2("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true, userGesture: true
    });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
    return result.result.value;
  }
  async function until2(expression, label, timeout = 8000) {
    for (let i = 0; i < timeout / 100; i++) {
      if (await script2(expression)) return;
      await pause(100);
    }
    throw Error("Timed out: " + label);
  }
  await send2("Page.enable");
  await send2("Runtime.enable");
  await until2("document.readyState==='complete' && document.getElementById('auth-form')!==null", "second tab loaded");
  await script2("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until2("document.getElementById('app-screen').hidden===false", "second tab unlocked");
  await Promise.all([
    script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Concurrent first tab'; document.getElementById('editor-form').requestSubmit()"),
    script2("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Concurrent second tab'; document.getElementById('editor-form').requestSubmit()")
  ]);
  await pause(1400);
  const firstLocked = await script("document.getElementById('app-screen').hidden");
  const secondLocked = await script2("document.getElementById('app-screen').hidden");
  assert.notEqual(firstLocked, secondLocked, "exactly one tab must remain unlocked after competing saves");
  const winningTab = firstLocked ? script2 : script;
  assert.equal(await winningTab("document.getElementById('item-count').textContent.startsWith('2 of 2')"), true,
    "only one of two concurrently added items should persist");
  assert.deepEqual(exceptions, [], "no uncaught browser exceptions");
  console.log(JSON.stringify({ status: "pass", scenarios: [
    "first-run confirmation", "encrypted item creation", "local ciphertext-only storage", "lock and unlock", "authenticated backup rejection", "verified restore", "mobile bottom navigation layout", "two-tab stale-save rejection"
  ], screenshotPaths: [
    "01-create-vault.png", "02-empty-workspace.png", "03-item-details.png", "04-mobile-workspace.png"
  ].map(name => join(workspace, name)) }, null, 2));
} finally {
  ws2?.close();
  ws?.close();
  chrome?.kill("SIGTERM");
  await new Promise(ok => server.close(ok));
  // Leave temporary screenshots in workspace for the visual review; no real secrets were used.
}
