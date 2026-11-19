import {describe,test,expect} from 'vitest';
import {parseProtonPassPlaintextJson,protonImportWarning} from './import_proton';
import {initialize,encryptEntries,unlock} from './crypto';

let next=0;
const id=()=> 'synthetic-proton-' + (++next);
function example():string {
  return JSON.stringify({
    version:'1.40.2',userId:'SYNTHETIC-USER',
    vaults:{FAKE_VAULT:{name:'Fake Personal',items:[
      {state:1,contentFormatVersion:8,pinned:true,files:['fake-attachment'],
        data:{type:'login',
          metadata:{name:'Synthetic login',note:'NOT-A-REAL-NOTE'},
          content:{itemEmail:'fake@example.invalid',itemUsername:'fake',
            password:'NOT-A-REAL-PASSWORD',
            urls:['https://example.invalid','https://extra.invalid'],
            totpUri:'JBSWY3DPEHPK3PXP',passkeys:[{id:'FAKE-PRIVATE-KEY'}]},
          extraFields:[
            {fieldName:'Fake secret',type:'hidden',data:{content:'NOT-A-REAL-CUSTOM'}},
            {fieldName:'Visible',type:'text',data:{content:'FAKE-VISIBLE'}},
            {fieldName:'Backup OTP',type:'totp',data:{totpUri:'JBSWY3DPEHPK3PXP'}},
            {fieldName:'Date',type:'timestamp',data:{timestamp:'2026-09-24'}}
          ],
          extraSections:[{sectionName:'Unsupported group',fields:[]}]
        }},
      {state:1,contentFormatVersion:8,pinned:false,files:[],
        data:{type:'note',metadata:{name:'Synthetic note',note:'NOT-A-REAL-SECRET-NOTE'},
          content:{},extraFields:[]}},
      {state:1,contentFormatVersion:8,data:{type:'creditCard',
          metadata:{name:'Fake card'},content:{}}},
      {state:1,contentFormatVersion:8,data:{type:'alias',
          metadata:{name:'Fake alias'},content:{}},aliasEmail:'FAKE-ALIAS'},
      {state:2,contentFormatVersion:8,data:{type:'login',
          metadata:{name:'Deleted'},content:{}}}
    ]}}
  });
}
describe('Proton Pass plaintext data.json migration',()=>{
  test('converts only supported items, counts omissions and encrypts before storage',async()=>{
    next=0;
    const parsed=parseProtonPassPlaintextJson(example(),id);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].kind).toBe('login');
    expect(parsed.entries[0].username).toBe('fake');
    expect(parsed.entries[0].favorite).toBe(true);
    expect(parsed.entries[0].tags).toEqual(['Fake Personal']);
    expect(parsed.entries[0].otp?.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(parsed.entries[0].customFields?.find(x=>x.name==='Fake secret')?.concealed).toBe(true);
    expect(parsed.entries[0].customFields?.find(x=>x.name==='Proton Pass email')?.value).toBe('fake@example.invalid');
    expect(parsed.entries[1].kind).toBe('note');
    expect(parsed).toMatchObject({
      skippedUnsupported:2,skippedTrash:1,passkeysNotImported:1,
      attachmentsNotImported:1,extraUrls:1,unsupportedFields:1,
      extraSections:1,secondaryEmailsPreserved:1,extraOtpPreserved:1
    });
    const warning=protonImportWarning(parsed);
    expect(warning).not.toContain('NOT-A-REAL-PASSWORD');
    expect(warning).not.toContain('NOT-A-REAL-CUSTOM');
    const created=await initialize('synthetic-proton-master-password');
    const ciphertext=await encryptEntries(parsed.entries,created.key,created.envelope.kdf.salt);
    expect(JSON.stringify(ciphertext)).not.toContain('NOT-A-REAL-PASSWORD');
    expect(JSON.stringify(ciphertext)).not.toContain('NOT-A-REAL-SECRET-NOTE');
    const decrypted=await unlock('synthetic-proton-master-password',ciphertext);
    expect(decrypted.entries).toEqual(parsed.entries);
  });
  test('rejects unsupported future schema, encrypted formats and malformed sources',()=>{
    for (const bad of [
      'invalid JSON','{"version":"1.0"}','{"version":"1.0","vaults":[]}',
      JSON.stringify({version:'1.0',vaults:{a:{name:'X',items:[
        {state:1,contentFormatVersion:9,data:{type:'login',metadata:{name:'X'},content:{}}}
      ]}}}),
      JSON.stringify({version:'1.0',vaults:{a:{name:'X',items:[
        {state:1,contentFormatVersion:8,data:{type:'alias',metadata:{name:'Alias'},content:{}}}
      ]}}})
    ])expect(()=>parseProtonPassPlaintextJson(bad,id)).toThrow();
    expect(()=>parseProtonPassPlaintextJson('x'.repeat(5_000_001),id)).toThrow();
  });
  test('rejects invalid state, malformed OTP and duplicate IDs',()=>{
    const raw=(items:object[])=>JSON.stringify({version:'1.0',vaults:{a:{name:'X',items}}});
    const note=(name:string)=>({
      state:1,contentFormatVersion:8,
      data:{type:'note',metadata:{name},content:{}}
    });
    expect(()=>parseProtonPassPlaintextJson(raw([
      {...note('bad'),state:7}
    ]),id)).toThrow();
    expect(()=>parseProtonPassPlaintextJson(raw([
      {state:1,contentFormatVersion:8,
        data:{type:'login',metadata:{name:'X'},
          content:{totpUri:'not-valid-!!!'}}}
    ]),id)).toThrow();
    expect(()=>parseProtonPassPlaintextJson(raw([note('A'),note('B')]),
      ()=> 'duplicate')).toThrow();
  });
});
