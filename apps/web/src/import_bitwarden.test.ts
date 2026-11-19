import {describe,expect,test} from 'vitest';
import {bitwardenImportWarning,parseBitwardenPlaintextJson} from './import_bitwarden';
import {encryptEntries,initialize,unlock} from './crypto';
const nextId = () => 'synthetic-' + (++current);
let current = 0;

function sample() {
  return JSON.stringify({
    encrypted:false,
    folders:[{id:'folder-1',name:'Synthetic folder'}],
    items:[
      {type:1,name:'Fake login',organizationId:null,folderId:'folder-1',
       favorite:true,notes:'TEST-ONLY-NOTES',reprompt:1,
       fields:[{name:'Hidden answer',value:'FAKE-VALUE',type:1}],
       login:{username:'fake-account',password:'NOT-REAL-PASSWORD',
         uris:[{uri:'https://example.invalid'},{uri:'https://extra.invalid'}],
         totp:'JBSWY3DPEHPK3PXP',
         fido2Credentials:[{id:'NOT-A-REAL-PASSKEY'}]},
       passwordHistory:[{password:'NOT-REAL-OLD-PASSWORD'}],
       attachments:[{id:'attachment-placeholder'}]},
      {type:2,name:'Fake secure note',organizationId:null,notes:'SYNTHETIC-NOTE',secureNote:{}},
      {type:3,name:'Credit card not representable',card:{}},
      {type:1,name:'Org-only',organizationId:'org-id',login:{}}
    ]
  });
}

describe('bounded Bitwarden plaintext JSON migration',()=>{
  test('converts personal login and note while counting all lossy fields',async()=>{
    current=0;
    const result=parseBitwardenPlaintextJson(sample(),nextId);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].kind).toBe('login');
    expect(result.entries[0].favorite).toBe(true);
    expect(result.entries[0].tags).toEqual(['Synthetic folder']);
    expect(result.entries[0].customFields?.[0]).toEqual(
      {name:'Hidden answer',value:'FAKE-VALUE',concealed:true});
    expect(result.entries[0].otp?.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result.entries[1].kind).toBe('note');
    expect(result).toMatchObject({
      skippedUnsupported:1,skippedOrganization:1,extraUris:1,
      passwordHistories:1,passkeyReferencesNotImported:1,
      unimportedAttachments:1,repromptNotImported:1
    });
    const preview=bitwardenImportWarning(result);
    expect(preview).not.toContain('NOT-REAL-PASSWORD');
    expect(preview).not.toContain('FAKE-VALUE');
    const created=await initialize('synthetic-password-long-enough');
    const sealed=await encryptEntries(result.entries,created.key,created.envelope.kdf.salt);
    const json=JSON.stringify(sealed);
    expect(json).not.toContain('NOT-REAL-PASSWORD');
    expect(json).not.toContain('FAKE-VALUE');
    const back=await unlock('synthetic-password-long-enough',sealed);
    expect(back.entries).toEqual(result.entries);
  });
  test('rejects encrypted exports, oversized files and missing structures',()=>{
    expect(()=>parseBitwardenPlaintextJson('{"encrypted":true,"items":[]}',nextId)).toThrow();
    expect(()=>parseBitwardenPlaintextJson('{"items":{}}',nextId)).toThrow();
    expect(()=>parseBitwardenPlaintextJson('x'.repeat(5_000_001),nextId)).toThrow();
    expect(()=>parseBitwardenPlaintextJson('{"items":[{"type":2,"name":"X","fields":[{"type":3}]}]}',nextId)).toThrow();
  });
  test('rejects invalid OTP and duplicate generated identifiers',()=>{
    const invalid=JSON.stringify({items:[{type:1,name:'Test',login:{totp:'not valid !!'}}]});
    expect(()=>parseBitwardenPlaintextJson(invalid,nextId)).toThrow();
    const twice=JSON.stringify({items:[{type:2,name:'A'},{type:2,name:'B'}]});
    expect(()=>parseBitwardenPlaintextJson(twice,()=> 'duplicated')).toThrow();
  });
});
