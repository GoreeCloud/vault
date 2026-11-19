import {expect,test} from '@playwright/test';

const master='synthetic-migration-master-password-only';

async function create(page:import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create vault'}).click();
  await expect(page.getByRole('heading',{name:/All items/})).toBeVisible();
}

const json=JSON.stringify({
  encrypted:false,
  folders:[{id:'folder-id',name:'Development only'}],
  items:[
    {type:1,name:'Synthetic Bitwarden login',folderId:'folder-id',favorite:true,
      notes:'FAKE NOTE',fields:[{name:'Hidden fake',value:'NOT-A-PRIVATE-SECRET',type:1}],
      login:{username:'fake@example.invalid',password:'NOT-A-REAL-PASSWORD',
        uris:[{uri:'https://example.invalid'},{uri:'https://extra.invalid'}],
        totp:'JBSWY3DPEHPK3PXP',
        fido2Credentials:[{id:'FAKE-PASSKEY-REFERENCE'}]}},
    {type:2,name:'Synthetic Bitwarden note',notes:'NOT-A-REAL-SECRET-NOTE',secureNote:{}},
    {type:3,name:'Unsupported test card',card:{}}
  ]
});

test('Bitwarden plaintext migration previews omissions and encrypts before storage',async({page})=>{
  await create(page);
  let confirmed=false;
  page.on('dialog',dialog=>{
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('2 login/note items');
    expect(dialog.message()).toContain('1 unsupported item types');
    expect(dialog.message()).toContain('1 passkeys');
    expect(dialog.message()).not.toContain('NOT-A-REAL-PASSWORD');
    confirmed=true;
    return dialog.accept();
  });
  await page.getByLabel('Bitwarden plaintext JSON file').setInputFiles({
    name:'synthetic-bitwarden.json',mimeType:'application/json',buffer:Buffer.from(json)
  });
  await expect(page.getByRole('button',{name:/Synthetic Bitwarden login/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Synthetic Bitwarden note/})).toBeVisible();
  expect(confirmed).toBe(true);
  const raw=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(raw).not.toContain('NOT-A-REAL-PASSWORD');
  expect(raw).not.toContain('NOT-A-PRIVATE-SECRET');
  expect(raw).not.toContain('NOT-A-REAL-SECRET-NOTE');
  await page.getByRole('button',{name:'Lock vault'}).click();
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock securely'}).click();
  await expect(page.getByRole('button',{name:/Synthetic Bitwarden login/})).toBeVisible();
});

test('malformed or encrypted Bitwarden JSON cannot modify existing vault',async({page})=>{
  await create(page);
  const first=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  await page.getByLabel('Bitwarden plaintext JSON file').setInputFiles({
    name:'bad-export.json',mimeType:'application/json',
    buffer:Buffer.from('{"encrypted":true,"items":[{"type":1,"name":"fake","login":{}}]}')
  });
  await expect(page.getByRole('status')).toContainText('Bitwarden import rejected');
  const second=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(second).toEqual(first);
});
