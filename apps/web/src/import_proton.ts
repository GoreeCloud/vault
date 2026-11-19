import type {CustomField, Entry} from './crypto';
import {parseOtp} from './otp';

type Dict = Record<string,unknown>;
const MAX_SOURCE_BYTES = 5_000_000;
const MAX_CONTENT_FORMAT = 8;

function obj(value:unknown, where:string):Dict {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid Proton Pass ' + where);
  return value as Dict;
}
function str(value:unknown, where:string, limit=20_000):string {
  if (value == null) return '';
  if (typeof value !== 'string' || value.length > limit)
    throw Error('Invalid Proton Pass ' + where);
  return value;
}
function list(value:unknown, where:string, limit=20_000):unknown[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > limit)
    throw Error('Invalid Proton Pass ' + where);
  return value;
}

export type ProtonImportPreview = {
  entries:Entry[];
  skippedUnsupported:number;
  skippedTrash:number;
  passkeysNotImported:number;
  attachmentsNotImported:number;
  extraUrls:number;
  unsupportedFields:number;
  extraSections:number;
  secondaryEmailsPreserved:number;
  extraOtpPreserved:number;
};

/** Only accepts a manually extracted plaintext Proton Pass data.json file.
 * This function does no I/O or persistence and never logs source content.
 */
export function parseProtonPassPlaintextJson(source:string, newId:()=>string):ProtonImportPreview {
  if (new TextEncoder().encode(source).length > MAX_SOURCE_BYTES)
    throw Error('Proton Pass plaintext JSON exceeds 5 MB');
  let parsed:unknown;
  try { parsed = JSON.parse(source); } catch { throw Error('Malformed Proton Pass JSON'); }
  const root = obj(parsed,'export');
  if (typeof root.version !== 'string' || !root.version || root.version.length > 80)
    throw Error('Expected Proton Pass data.json version');
  const vaults = obj(root.vaults,'vaults');
  if (Object.keys(vaults).length > 500) throw Error('Too many vaults');
  const result:ProtonImportPreview = {
    entries:[], skippedUnsupported:0,skippedTrash:0,passkeysNotImported:0,
    attachmentsNotImported:0,extraUrls:0,unsupportedFields:0,extraSections:0,
    secondaryEmailsPreserved:0,extraOtpPreserved:0
  };
  const ids = new Set<string>();
  let total = 0;
  for (const rawVault of Object.values(vaults)) {
    const vault = obj(rawVault,'vault');
    const tag = str(vault.name,'vault name',120).trim();
    for (const rawItem of list(vault.items,'items',20_000)) {
      if (++total > 20_000) throw Error('Too many items');
      const item = obj(rawItem,'item');
      if (item.state === 2) { result.skippedTrash++; continue; }
      if (item.state !== 1) throw Error('Unsupported item state');
      const version = item.contentFormatVersion;
      if (!Number.isInteger(version) || (version as number) < 1 ||
          (version as number) > MAX_CONTENT_FORMAT)
        throw Error('Unsupported Proton Pass content version');
      const data = obj(item.data,'item data');
      if (data.type !== 'login' && data.type !== 'note') {
        result.skippedUnsupported++; continue;
      }
      const meta = obj(data.metadata,'item metadata');
      const title = str(meta.name,'title').trim();
      if (!title) throw Error('Missing item title');
      const content = obj(data.content,'item content');
      const fields:CustomField[]=[];
      const kind = data.type;
      let otp:Entry['otp'];
      if (kind === 'login') {
        const uri = str(content.totpUri,'primary OTP',4096);
        if (uri) otp = parseOtp(uri);
      }
      for (const rawField of list(data.extraFields,'custom fields',30)) {
        const field=obj(rawField,'custom field');
        const type=str(field.type,'custom field type',30);
        const name=str(field.fieldName,'custom field name',150);
        const body=obj(field.data,'custom field data');
        if (type === 'text' || type === 'hidden') {
          fields.push({name,value:str(body.content,'custom field content'),
            concealed:type === 'hidden'});
        } else if (type === 'totp') {
          const uri=str(body.totpUri,'additional OTP',4096);
          if (uri) {
            if (!otp) otp=parseOtp(uri);
            else {
              result.extraOtpPreserved++;
              fields.push({name:'Extra OTP: ' + name,value:uri,concealed:true});
            }
          }
        } else result.unsupportedFields++;
      }
      result.extraSections += list(data.extraSections,'extra sections',100).length;
      result.attachmentsNotImported += list(item.files,'attachments',1000).length;
      const id=newId();
      if (typeof id !== 'string' || !id || id.length > 160 || ids.has(id))
        throw Error('Failed to create unique item ID');
      ids.add(id);
      const entry:Entry={id,title,username:'',password:'',website:'',
        notes:str(meta.note,'notes'),kind:kind === 'login'?'login':'note',
        favorite:item.pinned === true,tags:tag?[tag]:[],customFields:fields};
      if (kind === 'login') {
        const username=str(content.itemUsername,'username');
        const email=str(content.itemEmail,'email');
        entry.username=username || email;
        entry.password=str(content.password,'password');
        const urls=list(content.urls,'URLs',1000);
        if (urls.length) {
          entry.website=str(urls[0],'URL');
          result.extraUrls += Math.max(0,urls.length-1);
        }
        if (email && username && email !== username) {
          if (fields.length >= 30) throw Error('Too many fields to preserve email');
          fields.push({name:'Proton Pass email',value:email,concealed:false});
          result.secondaryEmailsPreserved++;
        }
        result.passkeysNotImported += list(content.passkeys,'passkeys',1000).length;
      }
      if (fields.length > 30) throw Error('Too many custom fields');
      if (otp) entry.otp=otp;
      result.entries.push(entry);
    }
  }
  if (!result.entries.length) throw Error('No supported active Proton Pass logins/notes');
  return result;
}

/** Count-only preview; never include user secrets or item titles. */
export function protonImportWarning(p:ProtonImportPreview):string {
  return 'Append ' + p.entries.length + ' supported Proton Pass logins/notes? ' +
    'This does not replace or deduplicate existing vault data. ' +
    'Not migrated: ' + p.skippedUnsupported + ' unsupported types, ' +
    p.skippedTrash + ' trashed items, ' + p.passkeysNotImported +
    ' passkeys from supported logins (unsupported items may contain additional credential data), ' +
    p.attachmentsNotImported + ' attachments, ' + p.extraUrls + ' extra URLs, ' +
    p.unsupportedFields + ' custom fields of unsupported types and ' +
    p.extraSections + ' extra sections. ' + p.extraOtpPreserved +
    ' extra OTP secrets retained as concealed fields; ' +
    p.secondaryEmailsPreserved + ' additional emails retained. ' +
    'No ZIP, PGP ciphertext, alias forwarding, or passkey private key is imported. ' +
    'Protect the original plaintext data.json and review every imported item.';
}
