/**
 * Fresh-profile encrypted backup portability rehearsal.
 *
 * Runs in a SECOND isolated Chromium user-data directory, not just another
 * tab sharing the original vault's origin/localStorage. Synthetic data only.
 * This is not a different physical device or a durable off-site backup test.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function verifyFreshProfileRestore({
  chromePath, workspace, port, encryptedEnvelope, backupPath
}) {
  if (!chromePath || !workspace || !Number.isInteger(port) || !backupPath ||
      typeof encryptedEnvelope !== "string") {
    throw new TypeError("Invalid isolated restore-test configuration.");
  }
  const profile = join(workspace, "isolated-recovery-profile");
  let chrome, ws;
  try {
    chrome = spawn(chromePath, [
      "--headless=new", "--disable-gpu", "--disable-dev-shm-usage",
      "--no-first-run", "--no-default-browser-check",
      "--user-data-dir=" + profile, "--remote-debugging-port=0", "about:blank"
    ], { stdio: "ignore" });
    const active = join(profile, "DevToolsActivePort");
    let debugPort;
    for (let i = 0; i < 120; i++) {
      if (existsSync(active)) {
        debugPort = Number((await readFile(active, "utf8")).split("\n")[0]);
        break;
      }
      if (chrome.exitCode !== null) throw Error("Fresh-profile Chromium exited during setup.");
      await pause(100);
    }
    if (!debugPort) throw Error("Fresh-profile debugging endpoint unavailable.");

    const targets = await (await fetch("http://127.0.0.1:" + debugPort + "/json/list")).json();
    const page = targets.find(target => target.type === "page");
    if (!page?.webSocketDebuggerUrl) throw Error("Fresh-profile page target unavailable.");
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolveReady, rejectReady) => {
      ws.addEventListener("open", resolveReady, { once: true });
      ws.addEventListener("error", rejectReady, { once: true });
    });

    let sequence = 0;
    const pending = new Map();
    function send(method, params = {}) {
      return new Promise((resolveResponse, rejectResponse) => {
        const id = ++sequence;
        pending.set(id, { resolveResponse, rejectResponse });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    ws.addEventListener("message", event => {
      const packet = JSON.parse(event.data);
      if (packet.id) {
        const waiter = pending.get(packet.id);
        if (waiter) {
          pending.delete(packet.id);
          packet.error
            ? waiter.rejectResponse(Error(packet.error.message))
            : waiter.resolveResponse(packet.result);
        }
      } else if (packet.method === "Page.javascriptDialogOpening") {
        // Only generated fixtures are used here. Accept the same restore
        // confirmation explicitly covered by the main browser test.
        void send("Page.handleJavaScriptDialog", { accept: true });
      }
    });

    async function script(expression) {
      const result = await send("Runtime.evaluate", {
        expression, awaitPromise: true, returnByValue: true, userGesture: true
      });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
      return result.result.value;
    }
    async function until(expression, label, timeout = 8000) {
      for (let i = 0; i < timeout / 100; i++) {
        if (await script(expression)) return;
        await pause(100);
      }
      throw Error("Fresh profile timed out: " + label);
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("DOM.enable");
    await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/" });
    await until("document.readyState==='complete' && !!document.getElementById('auth-action')",
      "initial authentication UI");
    assert.equal(
      await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"),
      null, "independent browser profile must start without an existing vault"
    );
    assert.equal(await script("document.getElementById('create-confirm-group').hidden"), false,
      "fresh profile has first-run state before restore");

    const dom = await send("DOM.getDocument", { depth: 1 });
    const file = await send("DOM.querySelector", {
      nodeId: dom.root.nodeId, selector: "#import-file"
    });
    if (!file.nodeId) throw Error("Fresh-profile backup import input not found.");
    await send("DOM.setFileInputFiles", { nodeId: file.nodeId, files: [backupPath] });
    await until("document.getElementById('restore-dialog').open", "backup selected");
    await script("document.getElementById('restore-passphrase').value='test-only secure browser phrase'; document.getElementById('restore-form').requestSubmit()");
    await until("document.getElementById('restore-dialog').open===false && document.getElementById('auth-message').textContent.includes('verified and restored')",
      "authenticated backup stored in fresh profile", 30000);
    assert.equal(
      await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"),
      encryptedEnvelope, "fresh-profile restore must preserve exact ciphertext"
    );
    await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
    await until("document.getElementById('app-screen').hidden===false && document.getElementById('item-count').textContent.startsWith('1 of')",
      "fresh-profile decrypted restored item", 30000);
    assert.equal(await script("document.getElementById('item-detail').textContent.includes('Browser fixture login')"), true);
    assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1').includes('dummy-only-do-not-use')"), false);
    return { isolatedProfile: true, restoredItemCount: 1 };
  } finally {
    ws?.close();
    chrome?.kill("SIGTERM");
  }
}
