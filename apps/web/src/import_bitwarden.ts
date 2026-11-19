import type { Entry, CustomField } from './crypto';
import { parseOtp } from './otp';

export type BitwardenImportPreview = {
  entries: Entry[];
  skippedUnsupported: number;
  skippedOrganization: number;
  extraUris: number;
  passwordHistories: number;
  passkeyReferencesNotImported: number;
  unimportedAttachments: number;
  repromptNotImported: number;
};

type Dictionary = Record<string, unknown>;
const MAX_PLAINTEXT_BYTES = 5_000_000;

function dictionary(value: unknown): Dictionary | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Dictionary : null;
}
function stringField(value: unknown, field: string, limit = 20_000): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string' || value.length > limit) {
    throw new Error('Invalid Bitwarden ' + field);
  }
  return value;
}
function validList(value: unknown, field: string, limit: number): unknown[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit) {
    throw new Error('Invalid Bitwarden ' + field);
  }
  return value;
}

/**
 * Bounded, synchronous, in-memory conversion. NEVER writes plaintext files,
 * downloads data, logs record content, or interacts with network/storage.
 * Only personal-vault logins and secure notes are representable here.
 * Caller must review omissions, confirm explicitly and encrypt atomically.
 */
export function parseBitwardenPlaintextJson(
  source: string, newId: () => string
): BitwardenImportPreview {
  if (new TextEncoder().encode(source).byteLength > MAX_PLAINTEXT_BYTES) {
    throw new Error('Plaintext export exceeds 5 MB');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(source); }
  catch { throw new Error('Invalid Bitwarden JSON'); }
  const root = dictionary(parsed);
  if (!root || root.encrypted === true || !Array.isArray(root.items) ||
      root.items.length > 20_000) {
    throw new Error('Expected a plaintext Bitwarden JSON export with items');
  }
  const folders = new Map<string, string>();
  for (const value of validList(root.folders, 'folders', 5000)) {
    const folder = dictionary(value);
    if (!folder) throw new Error('Malformed Bitwarden folder');
    const id = stringField(folder.id, 'folder id', 160);
    const name = stringField(folder.name, 'folder name', 120);
    if (id && name) folders.set(id, name);
  }
  const result: BitwardenImportPreview = {
    entries: [], skippedUnsupported: 0, skippedOrganization: 0, extraUris: 0,
    passwordHistories: 0, passkeyReferencesNotImported: 0,
    unimportedAttachments: 0, repromptNotImported: 0,
  };
  const ids = new Set<string>();
  for (const raw of root.items) {
    const item = dictionary(raw);
    if (!item) throw new Error('Malformed Bitwarden item');
    const type = item.type;
    if (type !== 1 && type !== 2) {
      result.skippedUnsupported++;
      continue;
    }
    if (item.organizationId !== null && item.organizationId !== undefined) {
      result.skippedOrganization++;
      continue;
    }
    const title = stringField(item.name, 'item name').trim();
    if (!title) throw new Error('Bitwarden item has no title');
    const notes = stringField(item.notes, 'notes');
    const customFields: CustomField[] = [];
    for (const rawField of validList(item.fields, 'custom fields', 30)) {
      const field = dictionary(rawField);
      if (!field || ![0, 1].includes(field.type as number)) {
        throw new Error('Bitwarden item has unsupported custom field type');
      }
      customFields.push({
        name: stringField(field.name, 'custom field name', 150),
        value: stringField(field.value, 'custom field value'),
        concealed: field.type === 1
      });
    }
    const folderId = stringField(item.folderId, 'folder id', 160);
    const tags = folderId && folders.has(folderId) ? [folders.get(folderId)!] : [];
    const id = newId();
    if (typeof id !== 'string' || id.length === 0 || id.length > 160 || ids.has(id)) {
      throw new Error('Failed to allocate unique item identifier');
    }
    ids.add(id);
    const converted: Entry = {
      id, title, username: '', password: '', website: '', notes, kind: type === 1 ? 'login' : 'note',
      favorite: item.favorite === true, tags, customFields
    };
    if (type === 1) {
      const login = dictionary(item.login);
      if (!login) throw new Error('Bitwarden login structure missing');
      converted.username = stringField(login.username, 'login username');
      converted.password = stringField(login.password, 'login password');
      const uris = validList(login.uris, 'login URIs', 1000);
      if (uris.length > 1) result.extraUris += uris.length - 1;
      if (uris.length) {
        const first = dictionary(uris[0]);
        if (!first) throw new Error('Invalid Bitwarden login URI');
        converted.website = stringField(first.uri, 'login URL');
      }
      const totp = stringField(login.totp, 'OTP seed', 4096);
      if (totp) converted.otp = parseOtp(totp);
      result.passkeyReferencesNotImported += validList(
        login.fido2Credentials, 'passkeys', 1000
      ).length;
    }
    if (item.reprompt === 1) result.repromptNotImported++;
    if (validList(item.passwordHistory, 'password history', 1000).length) {
      result.passwordHistories++;
    }
    if (validList(item.attachments, 'attachments', 1000).length) {
      result.unimportedAttachments++;
    }
    result.entries.push(converted);
  }
  if (result.entries.length === 0) throw new Error('No supported personal-vault items');
  return result;
}

/** Safe summary: only counts; never includes secret values or imported titles. */
export function bitwardenImportWarning(result: BitwardenImportPreview): string {
  return 'Import ' + result.entries.length + ' login/note items into this local encrypted vault? ' +
    'This APPENDS items (does not replace or deduplicate). Review all migrated records. ' +
    'Not migrated: ' + result.skippedUnsupported + ' unsupported item types, ' +
    result.skippedOrganization + ' organization items, ' +
    result.passkeyReferencesNotImported + ' passkeys, ' +
    result.unimportedAttachments + ' attachments, ' +
    result.passwordHistories + ' password histories, ' +
    result.extraUris + ' additional URLs, ' +
    result.repromptNotImported + ' reprompt policies. ' +
    'Your plaintext export remains on disk; delete it securely when finished.';
}
