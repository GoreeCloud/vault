/**
 * Development-only CLIENT-PRIVATE template vocabulary.
 *
 * This function accepts only synthetic field-name templates, never field values.
 * Names such as "password", "rpId" and "privateKey" are NOT data schemas for
 * secret ingestion. It does not encrypt, store, serialize, or expose templates
 * to a server, nor attest the safety of cryptographic keys or passkeys.
 *
 * Schema 0 is an unshippable fixture, not a production data format.
 */
const ALLOWED = Object.freeze({
  "login": Object.freeze(["username", "password", "website", "totp", "notes"]),
  "secure-note": Object.freeze(["title", "body"]),
  "payment-card": Object.freeze(["cardholder", "cardNumber", "expiration", "securityCode", "notes"]),
  "identity": Object.freeze(["fullName", "email", "address", "telephone", "notes"]),
  "passkey": Object.freeze(["rpId", "credentialId", "userHandle"]),
  "ssh-key": Object.freeze(["publicKey", "privateKey", "passphrase"])
});
const EXPECTED_KEYS = Object.freeze(["schemaVersion", "kind", "fieldNames"]);
const deny = reason => Object.freeze({ candidate: false, reason });

function exactRecord(obj, names) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  const p = Object.getPrototypeOf(obj);
  if (p !== Object.prototype && p !== null) return false;
  const keys = Reflect.ownKeys(obj);
  if (keys.length !== names.length) return false;
  return keys.every(k =>
    typeof k === "string" && names.includes(k) &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(obj, k), "value"));
}
function denseDataArray(value, maxLength) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      !Number.isSafeInteger(value.length) || value.length < 1 ||
      value.length > maxLength) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || !keys.includes("length")) return false;
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return false;
  }
  return true;
}

/** Non-authoritative shape-only result. Never echoes kind, fields or values. */
export function screenSyntheticClientItemTemplate(template) {
  try {
    if (!exactRecord(template, EXPECTED_KEYS)) return deny("invalid-shape");
    if (template.schemaVersion !== 0 ||
        typeof template.kind !== "string" ||
        !Object.hasOwn(ALLOWED, template.kind)) return deny("unsupported-development-type");
    const allowedNames = ALLOWED[template.kind];
    if (!denseDataArray(template.fieldNames, allowedNames.length)) {
      return deny("invalid-field-name-list");
    }
    let previous = -1;
    for (const field of template.fieldNames) {
      if (typeof field !== "string") return deny("invalid-field-name");
      const position = allowedNames.indexOf(field);
      if (position <= previous) return deny("unknown-duplicate-or-noncanonical-field");
      previous = position;
    }
    return Object.freeze({ candidate: true, reason: "client-template-fixture-only" });
  } catch {
    return deny("invalid-shape");
  }
}
