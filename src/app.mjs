import { createVault, openVault, sealVault, validateEnvelope } from "./crypto.mjs";
import { generatePassword, generateTotp, normalizeWebsite } from "./security.mjs";
import { guardedWrite, VaultWriteConflict } from "./storage.mjs";

const STORAGE_KEY = "goreecloud.vault.encrypted.v1";
const IDLE_MS = 5 * 60 * 1000;
const byId = id => document.getElementById(id);
let documentData = null;
let encryptionKey = null;
let cryptoParameters = null;
let selection = null;
let editingId = null;
let activeFilter = "all";
let lastActivity = Date.now();
let operations = Promise.resolve();
let sessionId = 0;
let lastSerialized = null;
let pendingBackup = null;
let pendingExpectedStorage = null;
let noticeTimer;

function announce(message, error = false) {
  const notice = byId("notice");
  notice.textContent = message;
  notice.dataset.error = String(error);
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 5500);
}
function message(id, value) { byId(id).textContent = value; }
function storedEnvelope() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}
function showAuth(note = "") {
  byId("auth-screen").hidden = false;
  byId("app-screen").hidden = true;
  const exists = Boolean(localStorage.getItem(STORAGE_KEY));
  byId("auth-action").textContent = exists ? "Unlock vault" : "Create my vault";
  byId("passphrase").setAttribute("autocomplete", exists ? "current-password" : "new-password");
  byId("passphrase").minLength = exists ? 1 : 12;
  byId("create-confirm-group").hidden = exists;
  byId("create-confirm").required = !exists;
  byId("create-confirm").value = "";
  byId("passphrase").value = "";
  message("auth-message", note || (exists
    ? "Enter the passphrase used to encrypt this device's vault."
    : "Set a passphrase of at least 12 characters. It cannot be reset."));
}
function showWorkspace() {
  byId("auth-screen").hidden = true;
  byId("app-screen").hidden = false;
  lastActivity = Date.now();
  render();
}
function lockVault(reason = "") {
  // Invalidate all delayed writes and unlocks before clearing the session.
  sessionId += 1;
  documentData = null;
  encryptionKey = null;
  cryptoParameters = null;
  lastSerialized = null;
  pendingBackup = null;
  pendingExpectedStorage = null;
  selection = null;
  editingId = null;
  byId("editor-form").reset();
  byId("passphrase-form").reset();
  byId("restore-form").reset();
  if (byId("editor-dialog").open) byId("editor-dialog").close();
  if (byId("passphrase-dialog").open) byId("passphrase-dialog").close();
  if (byId("restore-dialog").open) byId("restore-dialog").close();
  byId("item-list").replaceChildren();
  byId("item-detail").replaceChildren();
  showAuth(reason || "Vault locked. Unlock again to continue.");
}

async function writeEnvelope(envelope, epoch) {
  const serialized = JSON.stringify(envelope);
  await guardedWrite(localStorage, {
    key: STORAGE_KEY,
    expected: lastSerialized,
    next: serialized,
    locks: navigator.locks,
    isCurrent: () => sessionId === epoch
  });
  lastSerialized = serialized;
}

function scheduleOperation(task) {
  const epoch = sessionId;
  const operation = operations.catch(() => {}).then(async () => {
    if (!documentData || epoch !== sessionId) {
      throw new VaultWriteConflict("The vault is locked or the session expired.");
    }
    return task(epoch);
  });
  operations = operation;
  return operation;
}

async function persistDraft(draft, epoch) {
  if (!encryptionKey || epoch !== sessionId) {
    throw new VaultWriteConflict("The vault session expired.");
  }
  const envelope = await sealVault(draft, encryptionKey, cryptoParameters);
  await writeEnvelope(envelope, epoch);
}

async function commitDraft(change, success, afterCommit = () => {}) {
  try {
    await scheduleOperation(async epoch => {
      const draft = structuredClone(documentData);
      change(draft);
      await persistDraft(draft, epoch);
      if (epoch !== sessionId) return;
      documentData = draft;
      afterCommit();
      render();
      announce(success);
    });
    return true;
  } catch (error) {
    if (error instanceof VaultWriteConflict) {
      lockVault("Another tab changed the vault, or this session expired. Unlock to load the latest encrypted data.");
    } else {
      announce("Encrypted save failed: " + error.message + ". Existing saved data was preserved.", true);
    }
    return false;
  }
}

function itemNode(record) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "item-row" + (selection === record.id ? " selected" : "");
  button.setAttribute("role", "listitem");
  button.setAttribute("aria-pressed", String(selection === record.id));
  const icon = document.createElement("span");
  icon.className = "item-icon";
  icon.textContent = record.type === "note" ? "▧" : record.type === "secret" ? "◇" : "⌘";
  const body = document.createElement("span");
  body.className = "item-body";
  const title = document.createElement("strong");
  title.textContent = record.title;
  const secondary = document.createElement("small");
  secondary.textContent = record.username || record.website || record.type;
  body.append(title, secondary);
  const favorite = document.createElement("span");
  favorite.className = "item-favorite";
  favorite.textContent = record.favorite ? "★" : "›";
  button.append(icon, body, favorite);
  button.addEventListener("click", () => { selection = record.id; render(); });
  return button;
}
function renderList() {
  const query = byId("search-items").value.toLocaleLowerCase().trim();
  const visible = documentData.items.filter(item => {
    if (activeFilter === "favorite" && !item.favorite) return false;
    if (!["favorite", "all"].includes(activeFilter) && item.type !== activeFilter) return false;
    return [item.title, item.username, item.website, item.tags].some(
      field => field.toLocaleLowerCase().includes(query)
    );
  }).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title));
  message("item-count", visible.length + " of " + documentData.items.length + " encrypted items");
  const list = byId("item-list");
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "muted empty-list";
    empty.textContent = documentData.items.length ? "No matching items." : "Your vault is empty. Add your first item.";
    list.append(empty);
  } else visible.forEach(record => list.append(itemNode(record)));
  document.querySelectorAll("[data-filter]").forEach(button => {
    const on = button.dataset.filter === activeFilter;
    button.classList.toggle("active", on);
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}
function createText(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}
function field(label, value, options = {}) {
  const container = createText("div", "", "detail-field");
  container.append(createText("label", label));
  const line = createText("div", "", "detail-value");
  const text = createText("span", options.mask ? "••••••••••••" : (value || "Not set"));
  if (options.url && value) {
    const safe = normalizeWebsite(value);
    if (safe) {
      const link = document.createElement("a");
      link.href = safe;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = value;
      line.append(link);
    } else line.append(text);
  } else line.append(text);
  if (options.copy && value) {
    const copy = createText("button", "Copy", "tiny-action");
    copy.type = "button";
    copy.setAttribute("aria-label", "Copy " + label.toLowerCase());
    copy.addEventListener("click", () => copyValue(value));
    line.append(copy);
  }
  if (options.mask && value) {
    const reveal = createText("button", "Show", "tiny-action");
    reveal.type = "button";
    reveal.addEventListener("click", () => {
      const isHidden = text.textContent !== value;
      text.textContent = isHidden ? value : "••••••••••••";
      reveal.textContent = isHidden ? "Hide" : "Show";
    });
    line.append(reveal);
  }
  container.append(line);
  return container;
}
async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(value);
    announce("Copied. Other apps may retain clipboard contents.");
  } catch { announce("Clipboard unavailable. Use HTTPS or localhost.", true); }
}
function renderDetail() {
  const panel = byId("item-detail");
  panel.replaceChildren();
  const record = documentData.items.find(item => item.id === selection);
  if (!record) {
    panel.append(createText("div", "✧", "empty-art"),
      createText("h2", "Your safe space"),
      createText("p", "Select an item to see its details, or create something new."));
    return;
  }
  const head = createText("div", "", "detail-head");
  head.append(createText("div", record.type.toUpperCase() + " · ENCRYPTED ITEM", "eyebrow"));
  head.append(createText("h2", record.title));
  head.append(createText("p", "Protected inside your local encrypted vault.", "muted"));
  panel.append(head);
  panel.append(field("Username / account", record.username, { copy: true }));
  panel.append(field("Password / secret", record.password, { copy: true, mask: true }));
  panel.append(field("Website", record.website, { url: true }));
  panel.append(field("Tags", record.tags));
  panel.append(field("Private notes", record.notes));
  if (record.totpSecret) {
    const group = createText("div", "", "detail-field");
    group.append(createText("label", "Authenticator code"));
    const codeLine = createText("div", "", "detail-value");
    const code = createText("strong", "••••••", "otp-code");
    code.id = "otp-code";
    const copy = createText("button", "Copy code", "tiny-action");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      try { await copyValue(await generateTotp(record.totpSecret)); }
      catch { announce("Invalid TOTP secret.", true); }
    });
    const countdown = createText("small", "", "muted");
    countdown.id = "otp-remaining";
    codeLine.append(code, copy, countdown);
    group.append(codeLine);
    panel.append(group);
    refreshTotp();
  }
  const actions = createText("div", "", "detail-actions");
  const edit = createText("button", "Edit item", "gc-button primary");
  edit.type = "button";
  edit.addEventListener("click", () => openEditor(record.id));
  const favorite = createText("button", record.favorite ? "★ Favorited" : "☆ Favorite", "gc-button secondary");
  favorite.type = "button";
  favorite.addEventListener("click", () => {
    void commitDraft(draft => {
      const item = draft.items.find(entry => entry.id === record.id);
      if (!item) throw new Error("The selected item no longer exists.");
      item.favorite = !item.favorite;
    }, "Favorite updated.");
  });
  const remove = createText("button", "Delete", "gc-button danger");
  remove.type = "button";
  remove.addEventListener("click", async () => {
    if (!confirm('Delete "' + record.title + '" from this local vault? Export a backup first if needed.')) return;
    await commitDraft(draft => {
      draft.items = draft.items.filter(item => item.id !== record.id);
    }, "Item deleted.", () => { selection = null; });
  });
  actions.append(edit, favorite, remove);
  panel.append(actions);
}
async function refreshTotp() {
  if (!documentData || !selection || !byId("otp-code")) return;
  const record = documentData.items.find(item => item.id === selection);
  if (!record?.totpSecret) return;
  const target = byId("otp-code");
  try {
    const result = await generateTotp(record.totpSecret);
    if (byId("otp-code") === target && documentData) {
      target.textContent = result;
      message("otp-remaining", (30 - Math.floor(Date.now() / 1000) % 30) + " seconds remaining");
    }
  } catch { if (byId("otp-code") === target) target.textContent = "Invalid secret"; }
}
function render() { if (documentData) { renderList(); renderDetail(); } }
function openEditor(id = null) {
  const item = id && documentData.items.find(entry => entry.id === id);
  editingId = item?.id ?? null;
  message("editor-heading", item ? "Edit item" : "New item");
  message("editor-message", "");
  byId("edit-type").value = item?.type ?? "login";
  byId("edit-title").value = item?.title ?? "";
  byId("edit-username").value = item?.username ?? "";
  byId("edit-password").value = item?.password ?? "";
  byId("edit-website").value = item?.website ?? "";
  byId("edit-notes").value = item?.notes ?? "";
  byId("edit-tags").value = item?.tags ?? "";
  byId("edit-totp").value = item?.totpSecret ?? "";
  byId("edit-favorite").checked = item?.favorite ?? false;
  byId("edit-password").type = "password";
  byId("editor-dialog").showModal();
  byId("edit-title").focus();
}
async function saveEditor(event) {
  event.preventDefault();
  const title = byId("edit-title").value.trim();
  if (!title) { message("editor-message", "A title is required."); return; }
  const rawWebsite = byId("edit-website").value.trim();
  const website = rawWebsite ? normalizeWebsite(rawWebsite) : "";
  if (rawWebsite && !website) { message("editor-message", "Use a valid HTTP or HTTPS website URL."); return; }
  const entry = {
    id: editingId || crypto.randomUUID(), type: byId("edit-type").value,
    title, favorite: byId("edit-favorite").checked,
    username: byId("edit-username").value,
    password: byId("edit-password").value,
    website, notes: byId("edit-notes").value,
    tags: byId("edit-tags").value,
    totpSecret: byId("edit-totp").value.trim()
  };
  const saved = await commitDraft(draft => {
    if (editingId) {
      const index = draft.items.findIndex(item => item.id === editingId);
      if (index < 0) throw new Error("The edited item is no longer available.");
      draft.items[index] = entry;
    } else draft.items.push(entry);
  }, "Encrypted item saved.", () => { selection = entry.id; });
  if (saved) byId("editor-dialog").close();
}
async function unlockOrCreate(event) {
  event.preventDefault();
  const passphraseInput = byId("passphrase");
  const passphrase = passphraseInput.value;
  const button = byId("auth-action");
  button.disabled = true;
  message("auth-message", "Deriving your encryption key…");
  const epoch = ++sessionId;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const saved = JSON.parse(raw);
      const opened = await openVault(saved, passphrase);
      // A concurrent import or another tab changing the ciphertext must
      // invalidate the unlock, including while key derivation is in progress.
      if (epoch !== sessionId || localStorage.getItem(STORAGE_KEY) !== raw) {
        throw new VaultWriteConflict("Vault changed while unlocking. Try again.");
      }
      encryptionKey = opened.key;
      documentData = opened.document;
      cryptoParameters = { salt: saved.salt };
      lastSerialized = raw;
    } else {
      if (passphrase !== byId("create-confirm").value) {
        throw new Error("The new vault passphrases do not match.");
      }
      const created = await createVault(passphrase);
      const serialized = JSON.stringify(created.envelope);
      await guardedWrite(localStorage, {
        key: STORAGE_KEY,
        expected: null,
        next: serialized,
        locks: navigator.locks,
        isCurrent: () => epoch === sessionId
      });
      lastSerialized = serialized;
      encryptionKey = created.key;
      documentData = { version: 1, items: [] };
      cryptoParameters = { salt: created.envelope.salt };
    }
    selection = documentData.items[0]?.id ?? null;
    showWorkspace();
    announce("Vault unlocked on this device.");
  } catch (error) {
    message("auth-message", error.message);
  } finally {
    passphraseInput.value = "";
    byId("create-confirm").value = "";
    button.disabled = false;
  }
}

async function exportBackup() {
  try {
    await operations;
    const envelope = storedEnvelope();
    validateEnvelope(envelope);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "goreecloud-vault-encrypted-" + new Date().toISOString().slice(0, 10) + ".vault.json";
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Encrypted backup prepared. Store it somewhere safe.");
  } catch (error) { announce("Backup failed: " + error.message, true); }
}
async function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const epoch = sessionId;
  try {
    if (documentData) throw new Error("Lock the vault before importing.");
    if (file.size > 7 * 1024 * 1024) throw new Error("Backup exceeds the import size limit.");
    const backup = JSON.parse(await file.text());
    validateEnvelope(backup);
    if (epoch !== sessionId || documentData) {
      throw new VaultWriteConflict("Vault state changed while reading the backup.");
    }
    pendingBackup = backup;
    pendingExpectedStorage = localStorage.getItem(STORAGE_KEY);
    message("restore-message", "");
    byId("restore-form").reset();
    byId("restore-dialog").showModal();
    byId("restore-passphrase").focus();
  } catch (error) {
    message("auth-message", "Import preparation failed: " + error.message);
  } finally {
    event.target.value = "";
  }
}

async function verifyAndRestore(event) {
  event.preventDefault();
  const backup = pendingBackup;
  const expected = pendingExpectedStorage;
  const epoch = sessionId;
  if (!backup) {
    message("restore-message", "Choose an encrypted backup file first.");
    return;
  }
  const button = byId("verify-restore");
  button.disabled = true;
  message("restore-message", "Authenticating and validating encrypted backup…");
  try {
    // This must succeed before we offer to overwrite the current vault.
    const verified = await openVault(backup, byId("restore-passphrase").value);
    if (epoch !== sessionId || pendingBackup !== backup) {
      throw new VaultWriteConflict("The vault changed during backup verification.");
    }
    const count = verified.document.items.length;
    if (!confirm("Validated encrypted backup with " + count + " item(s). Replace the current local vault? This action cannot be undone, and does not merge items.")) {
      message("restore-message", "Import cancelled. No local data was replaced.");
      return;
    }
    const writeEpoch = ++sessionId;
    await guardedWrite(localStorage, {
      key: STORAGE_KEY,
      expected,
      next: JSON.stringify(backup),
      locks: navigator.locks,
      isCurrent: () => sessionId === writeEpoch && pendingBackup === backup
    });
    pendingBackup = null;
    pendingExpectedStorage = null;
    byId("restore-dialog").close();
    showAuth("Encrypted backup verified and restored. Unlock using its backup passphrase.");
  } catch (error) {
    if (error instanceof VaultWriteConflict) {
      lockVault("Vault changed during restore. No backup was imported.");
    } else {
      message("restore-message", "Backup not imported: " + error.message);
    }
  } finally {
    button.disabled = false;
  }
}

function cancelRestore() {
  pendingBackup = null;
  pendingExpectedStorage = null;
  byId("restore-form").reset();
  if (byId("restore-dialog").open) byId("restore-dialog").close();
}

async function changePassphrase(event) {
  event.preventDefault();
  const first = byId("next-passphrase").value;
  if (first !== byId("confirm-passphrase").value) {
    message("passphrase-message", "Passphrases do not match."); return;
  }
  if (first.length < 12) {
    message("passphrase-message", "Use at least 12 characters."); return;
  }
  byId("submit-passphrase").disabled = true;
  try {
    await scheduleOperation(async epoch => {
      const next = await createVault(first, structuredClone(documentData));
      await writeEnvelope(next.envelope, epoch);
      if (epoch !== sessionId) return;
      encryptionKey = next.key;
      cryptoParameters = { salt: next.envelope.salt };
      byId("passphrase-dialog").close();
      byId("passphrase-form").reset();
      announce("Passphrase changed. Export a new encrypted backup.");
    });
  } catch (error) {
    if (error instanceof VaultWriteConflict) {
      lockVault("The vault changed during passphrase rotation. Unlock again.");
    } else message("passphrase-message", error.message);
  }
  finally { byId("submit-passphrase").disabled = false; }
}

function setup() {
  if (!crypto?.subtle || !window.isSecureContext || !navigator.locks?.request) {
    message("auth-message", "This application requires Web Crypto, Web Locks, and HTTPS or localhost.");
    byId("auth-action").disabled = true;
    return;
  }
  showAuth();
  byId("auth-form").addEventListener("submit", unlockOrCreate);
  byId("import-file").addEventListener("change", importBackup);
  byId("restore-form").addEventListener("submit", verifyAndRestore);
  byId("cancel-restore").addEventListener("click", cancelRestore);
  byId("restore-dialog").addEventListener("close", () => {
    pendingBackup = null;
    pendingExpectedStorage = null;
    byId("restore-form").reset();
  });
  byId("new-item").addEventListener("click", () => openEditor());
  byId("editor-form").addEventListener("submit", saveEditor);
  byId("cancel-editor").addEventListener("click", () => byId("editor-dialog").close());
  byId("discard-editor").addEventListener("click", () => byId("editor-dialog").close());
  byId("generate-password").addEventListener("click", () => {
    byId("edit-password").value = generatePassword();
    byId("edit-password").type = "text";
    announce("Strong password generated. Save the item to encrypt it.");
  });
  byId("reveal-editor-password").addEventListener("click", () => {
    byId("edit-password").type = byId("edit-password").type === "password" ? "text" : "password";
  });
  byId("lock-vault").addEventListener("click", () => lockVault());
  byId("export-vault").addEventListener("click", exportBackup);
  byId("change-passphrase").addEventListener("click", () => {
    message("passphrase-message", "");
    byId("passphrase-dialog").showModal();
  });
  byId("passphrase-form").addEventListener("submit", changePassphrase);
  byId("cancel-passphrase").addEventListener("click", () => {
    byId("passphrase-form").reset();
    byId("passphrase-dialog").close();
  });
  byId("search-items").addEventListener("input", renderList);
  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => { activeFilter = button.dataset.filter; render(); });
  });
  ["pointerdown", "keydown", "input"].forEach(name =>
    document.addEventListener(name, () => { if (documentData) lastActivity = Date.now(); }, { passive: true })
  );
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY) {
      lockVault("Vault changed in another tab. Unlock again to load the latest encrypted data.");
    }
  });
  window.addEventListener("pagehide", () => lockVault());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && documentData &&
        Date.now() - lastActivity > IDLE_MS) lockVault("Vault automatically locked after inactivity.");
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && documentData) {
      event.preventDefault(); byId("search-items").focus();
    }
  });
  setInterval(() => {
    if (documentData && Date.now() - lastActivity > IDLE_MS) {
      lockVault("Vault automatically locked after inactivity.");
    } else if (documentData) refreshTotp();
  }, 1000);
}
setup();
