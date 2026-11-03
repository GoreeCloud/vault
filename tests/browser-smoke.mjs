// GoreeCloud Vault — browser smoke audit (test-only, no real secrets)
import { spawn } from "node:child_process";
import { startPreviewServer } from "../scripts/preview.mjs";
import { readFile, readdir, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const chromePath = process.env.CHROME_BIN;
if (!chromePath || !existsSync(chromePath)) throw Error("Set CHROME_BIN to an inspected, installed Chromium binary.");
const pause = ms => new Promise(done => setTimeout(done, ms));
const workspace = await mkdtemp(join(tmpdir(), "gc-vault-browser-"));
let server, chrome, ws, ws2;
try {
  server = await startPreviewServer(0);
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
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: workspace });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:" + port + "/" });
  await until("document.readyState==='complete' && document.getElementById('auth-action')!==null", "initial auth screen");
  assert.equal(await script("document.getElementById('create-confirm-group').hidden"), false);
  await screenshot("01-create-vault");
  assert.equal(await script("document.documentElement.dataset.theme === (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')"), true,
    "default appearance follows operating system");
  await script("document.querySelector('#auth-screen [data-theme-toggle]').click()");
  assert.equal(await script("document.documentElement.dataset.theme"), "light");
  await screenshot("05-light-auth");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.appearance.v1')"), "light");
  await script("document.querySelector('#auth-screen [data-theme-toggle]').click()");
  assert.equal(await script("document.documentElement.dataset.theme"), "dark");
  await script("document.querySelector('#auth-screen [data-theme-toggle]').click()");
  assert.equal(await script("document.querySelector('#auth-screen [data-theme-toggle]').dataset.mode"), "system");
  await script("document.querySelector('#auth-screen [data-theme-toggle]').click()");
  assert.equal(await script("document.documentElement.dataset.theme"), "light");
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('create-confirm').value='mismatched-only-test-passphrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('auth-message').textContent.includes('do not match')", "first run mismatch rejection");
  assert.equal(await script("document.getElementById('app-screen').hidden"), true);
  const duplicateCreate = await script("(() => { document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('create-confirm').value='test-only secure browser phrase'; const form=document.getElementById('auth-form'); form.requestSubmit(); const busy=document.getElementById('auth-action').disabled; form.requestSubmit(); return busy; })()");
  assert.equal(duplicateCreate, true, "create vault serializes repeated submit requests");
  await until("document.getElementById('app-screen').hidden === false", "create new vault");
  assert.equal(await script("document.getElementById('item-list').children.length"), 1);
  await screenshot("02-empty-workspace");
  await script("document.getElementById('new-item').click(); document.getElementById('generate-password').click()");
  const randomFixture = await script("document.getElementById('edit-password').value");
  assert.equal(randomFixture.length, 24, "generator uses the 24-character default");
  assert.match(randomFixture, /[a-z]/, "generated password contains lowercase");
  assert.match(randomFixture, /[A-Z]/, "generated password contains uppercase");
  assert.match(randomFixture, /[0-9]/, "generated password contains digits");
  assert.match(randomFixture, /[^a-zA-Z0-9]/, "generated password contains symbols");
  assert.equal(await script("document.getElementById('edit-password').type"), "password", "generated secret must remain hidden");
  await script("document.getElementById('generator-length').value='32'; document.getElementById('generator-uppercase').checked=false; document.getElementById('generator-symbols').checked=false; document.getElementById('generate-password').click()");
  const configuredPassword = await script("document.getElementById('edit-password').value");
  assert.equal(configuredPassword.length, 32, "configured generator length honored");
  assert.match(configuredPassword, /^[abcdefghjkmnpqrstuvwxyz23456789]+$/, "only selected character groups are used");
  assert.match(configuredPassword, /[abcdefghjkmnpqrstuvwxyz]/, "lowercase class represented");
  assert.match(configuredPassword, /[23456789]/, "digit class represented");
  assert.equal(await script("document.getElementById('edit-password').type"), "password", "configured output remains masked");
  await script("document.getElementById('generator-lowercase').checked=false; document.getElementById('generator-digits').checked=false; document.getElementById('generate-password').click()");
  await until("document.getElementById('editor-message').textContent.includes('Select at least one character group')", "generator rejects empty character groups");
  assert.equal(await script("document.getElementById('edit-password').value"), configuredPassword, "invalid generator settings preserve the existing value");
  await script("document.getElementById('generator-lowercase').checked=true; document.getElementById('generator-length').value='8'; document.getElementById('generate-password').click()");
  await until("document.getElementById('editor-message').textContent.includes('Password length must be from 12 to 128')", "generator rejects unsupported lengths");
  assert.equal(await script("document.getElementById('edit-password').value"), configuredPassword, "invalid length preserves existing value");
  await screenshot("09-generator-options");
  assert.equal(await script("document.getElementById('reveal-editor-password').getAttribute('aria-pressed')"), "false");
  await script("document.getElementById('reveal-editor-password').click()");
  assert.equal(await script("document.getElementById('edit-password').type"), "text");
  assert.equal(await script("document.getElementById('reveal-editor-password').getAttribute('aria-pressed')"), "true");
  await script("document.getElementById('reveal-editor-password').click()");
  assert.equal(await script("document.getElementById('edit-password').type"), "password");
  assert.equal(await script("document.getElementById('editor-dialog').getAttribute('aria-labelledby')"), "editor-heading", "editor dialog has accessible title");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await until("document.getElementById('editor-dialog').open===false", "keyboard Escape closes editor");
  await until("document.getElementById('edit-password').value === ''", "generated secret erased after Escape");
  assert.equal(await script("document.getElementById('edit-totp').value"), "", "unsaved authenticator secret cleared on Escape");
  await script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Browser fixture login'; document.getElementById('edit-username').value='fixture-user'; document.getElementById('edit-password').value='dummy-only-do-not-use'; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('editor-dialog').open===false && document.getElementById('item-count').textContent.startsWith('1 of')", "first encrypted save");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1').includes('dummy-only-do-not-use')"), false);
  await until("document.getElementById('edit-password').value === ''", "editor secret scrub after save");
  assert.equal(await script("document.getElementById('edit-password').type"), "password");

  // Adversarial synthetic content should remain inert in both vault views.
  const maliciousTitle = '<img src=x onerror="window.__gcVaultXssTriggered=true">';
  const maliciousNotes = '<svg onload="window.__gcVaultXssTriggered=true"></svg>';
  const beforeInvalidUrl = await script("localStorage.getItem('goreecloud.vault.encrypted.v1')");
  await script(
    "(() => { document.querySelector('#item-detail [data-vault-focus=\"detail:edit\"]').click();" +
    " document.getElementById('edit-title').value=" + JSON.stringify(maliciousTitle) + ";" +
    " document.getElementById('edit-notes').value=" + JSON.stringify(maliciousNotes) + ";" +
    " document.getElementById('edit-website').value='javascript:alert(1)';" +
    " document.getElementById('editor-form').requestSubmit(); })()"
  );
  await until("document.getElementById('editor-message').textContent.includes('valid HTTP or HTTPS website URL')",
    "dangerous website scheme rejected");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), beforeInvalidUrl,
    "invalid website cannot modify committed ciphertext");

  await script("document.getElementById('edit-website').value='https://example.test/secure'; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('editor-dialog').open===false && document.getElementById('item-detail').textContent.includes('onerror')",
    "HTML-looking fields saved as plain text");
  assert.equal(await script("document.querySelector('#item-list img, #item-detail img, #item-detail svg')===null"),
    true, "vault fields must not create executable img/svg elements");
  assert.equal(await script("window.__gcVaultXssTriggered === undefined"), true,
    "HTML-looking field data must not execute scripts");
  assert.equal(await script("document.getElementById('item-detail').textContent.includes('<svg onload=')"), true,
    "notes rendered as literal text");
  assert.equal(await script("document.querySelector('#item-detail a[href^=\"javascript:\"]')===null"), true,
    "unsafe links are absent");
  assert.equal(await script("(() => { const a=document.querySelector('#item-detail a[href^=\"https://example.test/secure\"]'); return !!a && a.target==='_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer'); })()"), true,
    "external website links must be HTTPS, noopener and noreferrer");

  await script("document.querySelector('#item-detail [data-vault-focus=\"detail:edit\"]').click(); document.getElementById('edit-title').value='Browser fixture login'; document.getElementById('edit-notes').value=''; document.getElementById('edit-website').value=''; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('editor-dialog').open===false && document.getElementById('item-detail').textContent.includes('Browser fixture login')",
    "restore benign browser test fixture");
  assert.equal(await script("window.__gcVaultXssTriggered === undefined"), true);

  await script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Never saved'; document.getElementById('edit-password').value='abandoned-test-only-secret'; document.getElementById('edit-totp').value='JBSWY3DPEHPK3PXP'; document.getElementById('cancel-editor').click()");
  await until("document.getElementById('edit-password').value === ''", "cancelled editor secret scrub");
  assert.equal(await script("document.getElementById('edit-totp').value"), "");
  assert.equal(await script("document.getElementById('edit-title').value"), "");
  assert.equal(await script("document.getElementById('item-count').textContent.startsWith('1 of 1')"), true);
  await script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Invalid authenticator'; document.getElementById('edit-totp').value='invalid-base32-0'; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('editor-message').textContent.includes('Invalid authenticator secret')", "invalid authenticator enrollment rejected");
  assert.equal(await script("document.getElementById('editor-dialog').open"), true);
  assert.equal(await script("document.getElementById('item-count').textContent.startsWith('1 of 1')"), true);
  await script("document.getElementById('cancel-editor').click()");
  await until("document.getElementById('edit-totp').value === ''", "invalid secret cleared after cancellation");
  await screenshot("03-item-details");
  assert.equal(await script("(() => { const b=document.querySelector('#item-list > li > button'); b.focus(); b.click(); return document.activeElement===document.querySelector('#item-list > li > button'); })()"), true, "selected list item retains keyboard focus after rendering");
  await script("(() => { const f=document.querySelector('#item-detail [data-vault-focus=\"detail:favorite\"]'); f.focus(); f.click(); })()");
  await until("document.querySelector('#item-detail [data-vault-focus=\"detail:favorite\"]')?.textContent.includes('Favorited')", "favorite saved");
  assert.equal(await script("document.activeElement?.dataset.vaultFocus"), "detail:favorite");
  await script("(() => { document.querySelector('#item-detail [data-vault-focus=\"detail:edit\"]').click(); document.getElementById('edit-notes').value='Updated exactly once'; document.getElementById('edit-totp').value='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; const form=document.getElementById('editor-form'); form.requestSubmit(); form.requestSubmit(); })()");
  await until("document.getElementById('editor-dialog').open === false && document.getElementById('item-detail').textContent.includes('Updated exactly once')", "edited item saved once");
  assert.equal(await script("document.getElementById('item-count').textContent.startsWith('1 of 1')"), true, "rapid duplicate submit does not create another item");
  await until("document.getElementById('edit-notes').value === ''", "editor notes scrub after save");
  await until("document.getElementById('otp-code')?.textContent.match(/^\\d{6}$/)", "valid authenticator code generated from saved secret");
  await script("document.getElementById('security-check').click()");
  await until("document.getElementById('health-dialog').open", "local security check opens");
  assert.equal(await script("document.getElementById('health-summary').textContent.includes('Logins reviewed')"), true);
  assert.equal(await script("document.getElementById('health-summary').textContent.includes('1')"), true);
  assert.equal(await script("document.getElementById('health-findings').textContent.includes('dummy-only-do-not-use')"), false);
  await screenshot("08-health-check");
  await script("document.getElementById('close-health').click()");
  assert.equal(await script("document.getElementById('health-findings').children.length"), 0);
  await script("document.getElementById('security-check').click()");
  await script("document.getElementById('close-health-icon').click()");
  assert.equal(await script("document.querySelector('#item-list').tagName"), "UL");
  assert.equal(await script("document.querySelector('#item-list > li > button').getAttribute('aria-pressed')"), "true");
  await screenshot("06-light-workspace");
  assert.equal(await script("(() => { const e=document.querySelector('.gc-button.primary');const s=getComputedStyle(e);const c=x=>x.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});const a=c(s.color),b=c(s.backgroundColor);const l=x=>.2126*x[0]+.7152*x[1]+.0722*x[2];return (Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05)>=4.5;})()"), true,
    "primary action text passes 4.5:1 contrast in light appearance");
  const encryptedOriginal = await script("localStorage.getItem('goreecloud.vault.encrypted.v1')");
  // Simulate a quota/storage failure during an attempted mutation. The
  // previously committed ciphertext must remain exportable for recovery.
  await script("(() => { window.__testOriginalSetItem=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value){ if(key==='goreecloud.vault.encrypted.v1') throw new DOMException('quota exceeded', 'QuotaExceededError'); return window.__testOriginalSetItem.call(this,key,value); }; document.getElementById('new-item').click();document.getElementById('edit-title').value='Failed storage fixture';document.getElementById('edit-password').value='dummy-unsaved-after-quota';document.getElementById('editor-form').requestSubmit(); })()");
  await until("document.getElementById('notice').textContent.includes('Encrypted save failed')", "storage quota failure reported");
  await script("Storage.prototype.setItem=window.__testOriginalSetItem;delete window.__testOriginalSetItem;document.getElementById('discard-editor').click()");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), encryptedOriginal,
    "failed save must leave previously committed ciphertext unchanged");
  assert.equal(await script("document.getElementById('item-count').textContent.startsWith('1 of 1')"), true,
    "failed mutation must not appear as a saved item");
  // Exercise the actual Export backup control; do not manufacture the backup
  // by copying localStorage into a fixture file.
  await script("document.getElementById('export-vault').click()");
  const exportPattern = /^goreecloud-vault-encrypted-\d{4}-\d{2}-\d{2}\.vault\.json$/;
  let backupPath = "";
  for (let i = 0; i < 100; i++) {
    const names = await readdir(workspace);
    const exported = names.find(name => exportPattern.test(name));
    if (exported && !names.some(name => name.endsWith(".crdownload"))) {
      backupPath = join(workspace, exported);
      break;
    }
    await pause(100);
  }
  assert.ok(backupPath, "the Export backup button must download an encrypted .vault.json file");
  const backupText = await readFile(backupPath, "utf8");
  const backupEnvelope = JSON.parse(backupText);
  assert.deepEqual(backupEnvelope, JSON.parse(encryptedOriginal),
    "downloaded backup must match the committed encrypted vault envelope");
  assert.equal(backupText.includes("dummy-only-do-not-use"), false,
    "exported encrypted backup must not contain the fixture password");
  assert.equal(backupText.includes("fixture-user"), false,
    "exported encrypted backup must not contain the fixture username");
  await script("document.getElementById('new-item').click(); document.getElementById('edit-title').value='Temporary item'; document.getElementById('edit-password').value='test-value'; document.getElementById('editor-form').requestSubmit()");
  await until("document.getElementById('item-count').textContent.startsWith('2 of')", "second item saved");
  await script("document.getElementById('lock-vault').click()");
  await until("document.getElementById('auth-screen').hidden===false", "manual lock");
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden===false && document.getElementById('item-count').textContent.startsWith('2 of')", "unlock retained items");
  const beforeRotation = await script("localStorage.getItem('goreecloud.vault.encrypted.v1')");
  await script("document.getElementById('change-passphrase').click()");
  assert.equal(await script("document.getElementById('passphrase-dialog').getAttribute('aria-labelledby')"), "change-passphrase-heading");
  await script("document.getElementById('current-passphrase').value='wrong-current-test-phrase'; document.getElementById('next-passphrase').value='test-only rotated browser phrase'; document.getElementById('confirm-passphrase').value='test-only rotated browser phrase'; document.getElementById('passphrase-form').requestSubmit()");
  await until("document.getElementById('passphrase-message').textContent.includes('Passphrase unchanged:')", "reject wrong current passphrase");
  assert.equal(await script("document.getElementById('passphrase-dialog').open"), true);
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), beforeRotation);
  const rotationGuards = await script("(() => { const form=document.getElementById('passphrase-form');" +
    " document.getElementById('current-passphrase').value='test-only secure browser phrase';" +
    " document.getElementById('next-passphrase').value='test-only rotated browser phrase';" +
    " document.getElementById('confirm-passphrase').value='test-only rotated browser phrase';" +
    " form.requestSubmit();" +
    " const busy=document.getElementById('submit-passphrase').disabled && document.getElementById('cancel-passphrase').disabled;" +
    " const dialog=document.getElementById('passphrase-dialog');" +
    " const escapeBlocked=!dialog.dispatchEvent(new Event('cancel',{cancelable:true}));" +
    " document.getElementById('cancel-passphrase').click();" +
    " form.requestSubmit();" +
    " return {busy,escapeBlocked,stillOpen:dialog.open}; })()");
  assert.deepEqual(rotationGuards, { busy: true, escapeBlocked: true, stillOpen: true },
    "in-flight passphrase rotation blocks duplicate submits and accidental cancellation");
  await until("document.getElementById('passphrase-dialog').open===false && document.getElementById('notice').textContent.includes('Passphrase changed')", "rotate passphrase after current verification");
  await until("document.getElementById('submit-passphrase').disabled===false", "rotation controls restored");
  assert.notEqual(await script("JSON.parse(localStorage.getItem('goreecloud.vault.encrypted.v1')).salt"), JSON.parse(beforeRotation).salt);
  await script("document.getElementById('search-items').value='fixture-sensitive-lookup'; document.getElementById('lock-vault').click()");
  await until("document.getElementById('auth-screen').hidden===false", "lock after rekey");
  assert.equal(await script("document.getElementById('search-items').value"), "");
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('auth-message').textContent.includes('Unable to unlock')", "old passphrase rejected after rotation");
  await script("document.getElementById('passphrase').value='test-only rotated browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden === false && document.getElementById('item-count').textContent.startsWith('2 of')", "new passphrase recovers both records");
  await script("document.getElementById('lock-vault').click()");
  const corruptedLocal = await script("(() => { const key='goreecloud.vault.encrypted.v1'; const envelope=JSON.parse(localStorage.getItem(key)); envelope.ciphertext=(envelope.ciphertext[0]==='A'?'B':'A')+envelope.ciphertext.slice(1); const changed=JSON.stringify(envelope);localStorage.setItem(key,changed); return changed; })()");
  await script("document.getElementById('passphrase').value='test-only rotated browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('auth-message').textContent.includes('Unable to unlock')", "tampered local vault fails authenticated unlock");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), corruptedLocal, "damaged encrypted data is not silently replaced");
  const dom = await send("DOM.getDocument", { depth: 1 });
  const fileInput = await send("DOM.querySelector", { nodeId: dom.root.nodeId, selector: "#import-file" });
  const damagedBackup = JSON.parse(encryptedOriginal);
  damagedBackup.ciphertext = (damagedBackup.ciphertext[0]==="A"?"B":"A") + damagedBackup.ciphertext.slice(1);
  const damagedBackupPath = join(workspace, "tampered-test-backup.json");
  await writeFile(damagedBackupPath, JSON.stringify(damagedBackup), "utf8");
  await send("DOM.setFileInputFiles", { nodeId: fileInput.nodeId, files: [damagedBackupPath] });
  await until("document.getElementById('restore-dialog').open === true", "tampered backup restore dialog opens");
  await script("document.getElementById('restore-passphrase').value='test-only secure browser phrase'; document.getElementById('restore-form').requestSubmit()");
  await until("document.getElementById('restore-message').textContent.includes('Backup not imported')", "tampered encrypted backup rejected");
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), corruptedLocal, "tampered backup must not replace damaged local state");
  await script("document.getElementById('cancel-restore').click()");
  await until("document.getElementById('restore-dialog').open === false", "cancel tampered backup");
  await send("DOM.setFileInputFiles", { nodeId: fileInput.nodeId, files: [backupPath] });
  await until("document.getElementById('restore-dialog').open===true", "restore dialog opens");
  // Reproduce a close event queued by the cancelled previous backup import:
  // the newly opened dialog must not lose its pending authenticated backup.
  await script("document.getElementById('restore-passphrase').value='test-only sentinel'; document.getElementById('restore-dialog').dispatchEvent(new Event('close'))");
  assert.equal(await script("document.getElementById('restore-passphrase').value"), "test-only sentinel",
    "delayed close from previous restore must not reset newly opened form");
  await script("document.getElementById('restore-passphrase').value='wrong-backup-passphrase'; document.getElementById('restore-form').requestSubmit()");
  await until("document.getElementById('restore-message').textContent.includes('Backup not imported')", "wrong password rejected");
  assert.equal(await script("document.getElementById('restore-dialog').open"), true);
  const restoreGuards = await script("(() => {" +
    " const form=document.getElementById('restore-form');" +
    " document.getElementById('restore-passphrase').value='test-only secure browser phrase';" +
    " form.requestSubmit();" +
    " const busy=document.getElementById('verify-restore').disabled && document.getElementById('cancel-restore').disabled;" +
    " const dialog=document.getElementById('restore-dialog');" +
    " const escapeBlocked=!dialog.dispatchEvent(new Event('cancel',{cancelable:true}));" +
    " document.getElementById('cancel-restore').click();" +
    " form.requestSubmit();" +
    " return {busy,escapeBlocked,stillOpen:dialog.open}; })()");
  assert.deepEqual(restoreGuards, {busy:true,escapeBlocked:true,stillOpen:true},
    "in-flight backup verification blocks duplicate submit and misleading cancellation");
  // Authenticated backup validation runs 600,000 PBKDF2 iterations and a
  // user-confirmation dialog; shared CI runners can be considerably slower
  // than the interactive test machine. Give this crypto step a separate
  // bounded deadline rather than treating 8 seconds as a correctness limit.
  try {
    await until("document.getElementById('restore-dialog').open===false && document.getElementById('auth-message').textContent.includes('verified and restored')",
      "verified backup replaced local storage", 30000);
  } catch (error) {
    // Only expose fixed UI states; never include backup contents, input values,
    // passphrases, encrypted payloads, or item records in CI logs.
    const state = await script("({dialogOpen:document.getElementById('restore-dialog').open,authVisible:!document.getElementById('auth-screen').hidden,verifying:document.getElementById('restore-message').textContent.includes('Authenticating and validating'),restoreError:document.getElementById('restore-message').textContent.includes('Backup not imported'),restoreCancelled:document.getElementById('restore-message').textContent.includes('Import cancelled'),missingBackup:document.getElementById('restore-message').textContent.includes('Choose an encrypted backup file first'),restored:document.getElementById('auth-message').textContent.includes('verified and restored')})");
    throw Error(error.message + " (sanitized restore state: " + JSON.stringify(state) + ")");
  }
  assert.equal(await script("localStorage.getItem('goreecloud.vault.encrypted.v1')"), encryptedOriginal);
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden === false && document.getElementById('item-count').textContent.startsWith('1 of')", "restored one-item backup");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await script("document.documentElement.scrollWidth <= window.innerWidth"), true, "mobile layout must not scroll sideways");
  assert.equal(await script("Math.abs(document.querySelector('.sidebar .nav-stack').getBoundingClientRect().bottom - window.innerHeight) <= 2"), true, "mobile nav stays at bottom of viewport");
  await screenshot("04-mobile-workspace");
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 720, deviceScaleFactor: 1, mobile: true });
  assert.equal(await script("document.documentElement.scrollWidth <= window.innerWidth"), true, "320px mobile must not scroll sideways");
  await screenshot("07-narrow-mobile");
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-contrast", value: "more" },
    { name: "prefers-reduced-motion", value: "reduce" }
  ]});
  assert.equal(await script("getComputedStyle(document.documentElement).getPropertyValue('--gc-outline').trim()"), "#56647d");
  assert.equal(await script("parseFloat(getComputedStyle(document.querySelector('.gc-button')).transitionDuration) <= 0.01"), true);
  await send("Emulation.setEmulatedMedia", { features: [] });

  // Simulate expiration against the application's real periodic idle-check
  // while a secret editor is open. No production clocks or credentials change.
  await script("document.querySelector('#item-detail [data-vault-focus=\"detail:edit\"]').click(); document.getElementById('edit-password').value='unsaved-synthetic-secret'; document.getElementById('edit-totp').value='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'");
  assert.equal(await script("document.getElementById('editor-dialog').open"), true);
  await script("(() => { const real=Date.now; window.__gcTestDateNow=real; Date.now=()=>real()+6*60*1000; })()");
  await until("document.getElementById('auth-screen').hidden===false && document.getElementById('editor-dialog').open===false", "idle timeout locks an open editor");
  assert.equal(await script("document.getElementById('edit-password').value"), "", "idle lock scrubs unsaved password");
  assert.equal(await script("document.getElementById('edit-totp').value"), "", "idle lock scrubs unsaved authenticator secret");
  assert.equal(await script("document.getElementById('item-detail').children.length"), 0, "idle lock removes decrypted item details");
  assert.equal(await script("document.getElementById('item-list').children.length"), 0, "idle lock removes decrypted item list");
  await script("Date.now=window.__gcTestDateNow; delete window.__gcTestDateNow");
  await script("document.getElementById('passphrase').value='test-only secure browser phrase'; document.getElementById('auth-form').requestSubmit()");
  await until("document.getElementById('app-screen').hidden===false && document.getElementById('item-count').textContent.startsWith('1 of')", "unlock after simulated inactivity");

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
    "first-run confirmation", "duplicate create submissions are serialized", "encrypted item creation", "local ciphertext-only storage", "lock and unlock", "authenticated backup rejection", "verified passphrase rotation and old-credential rejection", "in-flight passphrase rotation cannot be cancelled or double-submitted",
    "corrupted local ciphertext rejection and recovery from authenticated backup", "verified restore", "stale restore-dialog close cannot clear newer encrypted import", "in-flight backup verification blocks double-submit and cancellation", "actual exported backup download and restore", "backup remains exportable after rejected save", "mobile bottom navigation layout", "two-tab stale-save rejection",
    "OS/system + light/dark preference", "light-theme action contrast", "320px viewport and high contrast/motion preferences", "local-only password health report", "stable keyboard focus after item selection and favorite update", "closed-editor secret scrubbing and duplicate-save protection", "TOTP secret enrollment validation", "automatic inactivity lock scrubs open secret editor", "generated passwords masked until explicitly revealed", "configurable generator length and character groups", "named dialogs and keyboard Escape secret cleanup", "hardened loopback-only preview browser acceptance", "safe rendering of hostile HTML text and URL rejection"
  ], screenshotPaths: [
    "01-create-vault.png", "02-empty-workspace.png", "03-item-details.png", "04-mobile-workspace.png",
    "05-light-auth.png", "06-light-workspace.png", "07-narrow-mobile.png", "08-health-check.png", "09-generator-options.png"
  ].map(name => join(workspace, name)) }, null, 2));
} finally {
  ws2?.close();
  ws?.close();
  chrome?.kill("SIGTERM");
  if (server) await new Promise(ok => server.close(ok));
  // Leave temporary screenshots in workspace for the visual review; no real secrets were used.
}
