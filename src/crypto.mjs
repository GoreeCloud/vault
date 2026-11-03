/**
 * GoreeCloud Vault — local-only encrypted document format v1.
 * This cryptographic design is pre-alpha and has not received an external audit.
 * Vault plaintext and the nonextractable CryptoKey are never sent to a server.
 */
export const FORMAT = "goreecloud.vault.local.v1";
export const ITERATIONS = 600_000;
const ENVELOPE_FIELDS = new Set(["format", "kdf", "iterations", "salt", "iv", "ciphertext"]);
const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const te = new TextEncoder();
const td = new TextDecoder("utf-8", { fatal: true });

function bytesToBase64(bytes) {
  let result = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(result);
}

function base64ToBytes(encoded, expectedLength) {
  if (typeof encoded !== "string" || encoded.length > 8 * 1024 * 1024 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
    throw new Error("Malformed vault encoding.");
  }
  let binary;
  try { binary = atob(encoded); } catch { throw new Error("Malformed vault encoding."); }
  if (expectedLength !== undefined && binary.length !== expectedLength) {
    throw new Error("Invalid encryption parameter length.");
  }
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function randomBytes(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function validateDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document) ||
      document.version !== 1 || !Array.isArray(document.items) ||
      document.items.length > 10_000) {
    throw new Error("Unsupported or corrupt vault document.");
  }
  const ids = new Set();
  for (const item of document.items) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
        !/^[a-zA-Z0-9-]{8,64}$/.test(item.id ?? "") ||
        !["login", "note", "secret"].includes(item.type) ||
        typeof item.title !== "string" || item.title.length > 256 ||
        typeof item.favorite !== "boolean" ||
        ["username", "password", "website", "notes", "tags", "totpSecret"].some(
          field => typeof item[field] !== "string" || item[field].length > 100_000
        ) || ids.has(item.id)) {
      throw new Error("Unsupported or corrupt vault item.");
    }
    ids.add(item.id);
  }
  return document;
}

export function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
      envelope.format !== FORMAT || envelope.kdf !== "PBKDF2-SHA256" ||
      envelope.iterations !== ITERATIONS) {
    throw new Error("Unsupported vault encryption format.");
  }
  // v1 exposes exactly these six public cryptographic parameters. An import
  // with additional fields may persist cleartext metadata outside AES-GCM,
  // violating the ciphertext-only storage boundary. Extensions need a new
  // explicitly reviewed format rather than silent passthrough.
  const keys = Object.keys(envelope);
  if (keys.length !== ENVELOPE_FIELDS.size ||
      keys.some(key => !ENVELOPE_FIELDS.has(key))) {
    throw new Error("Unexpected vault encryption envelope fields.");
  }
  base64ToBytes(envelope.salt, SALT_LENGTH);
  base64ToBytes(envelope.iv, NONCE_LENGTH);
  const maxCiphertext = MAX_DOCUMENT_BYTES + 16;
  // Reject oversized ciphertext before allocating or attempting to decrypt.
  if (typeof envelope.ciphertext !== "string" ||
      envelope.ciphertext.length > Math.ceil(maxCiphertext / 3) * 4) {
    throw new Error("Encrypted vault exceeds its format size limit.");
  }
  const ciphertext = base64ToBytes(envelope.ciphertext);
  if (ciphertext.length < 17 || ciphertext.length > maxCiphertext) {
    throw new Error("Corrupt or oversized encrypted vault.");
  }
  return envelope;
}

async function deriveKey(passphrase, salt) {
  if (typeof passphrase !== "string" || passphrase.length === 0) {
    throw new Error("A vault passphrase is required.");
  }
  const material = await crypto.subtle.importKey(
    "raw", te.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function sealVault(document, key, parameters) {
  validateDocument(document);
  const plaintext = te.encode(JSON.stringify(document));
  if (plaintext.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("Vault exceeds the local storage safety limit.");
  }
  const salt = parameters?.salt;
  base64ToBytes(salt, SALT_LENGTH);
  const iv = randomBytes(NONCE_LENGTH);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: te.encode(FORMAT) }, key, plaintext
  ));
  return {
    format: FORMAT,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext)
  };
}

export async function createVault(passphrase, document = { version: 1, items: [] }) {
  if (typeof passphrase !== "string" || passphrase.length < 12) {
    throw new Error("Choose a passphrase with at least 12 characters.");
  }
  const salt = bytesToBase64(randomBytes(SALT_LENGTH));
  const key = await deriveKey(passphrase, base64ToBytes(salt, SALT_LENGTH));
  return { key, envelope: await sealVault(document, key, { salt }) };
}

export async function openVault(envelope, passphrase) {
  validateEnvelope(envelope);
  const key = await deriveKey(passphrase, base64ToBytes(envelope.salt, SALT_LENGTH));
  let raw;
  try {
    raw = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(envelope.iv, NONCE_LENGTH),
        additionalData: te.encode(FORMAT)
      },
      key,
      base64ToBytes(envelope.ciphertext)
    );
  } catch {
    throw new Error("Unable to unlock: incorrect passphrase or damaged vault.");
  }
  if (raw.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error("Vault document is too large.");
  }
  let document;
  try { document = JSON.parse(td.decode(raw)); }
  catch { throw new Error("Decrypted vault document is invalid."); }
  return { key, document: validateDocument(document) };
}
