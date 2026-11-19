import {expect,test} from '@playwright/test';

const master='synthetic-proton-import-master-password';
const source=JSON.stringify({version:'1.40.2',userId:'FAKE',
  vaults:{FAKE_VAULT:{name:'Fake Personal',items:[
    {state:1,contentFormatVersion:8,data:{type:'login',
      metadata:{name:'Synthetic Proton login',note:'NOT-A-REAL-NOTE'},
      content:{itemEmail:'fake@example.invalid',itemUsername:'fake',
        password:'NOT-REAL-PROTON-PASSWORD',
        urls:['https://example.invalid'],totpUri:'JBSWY3DPEHPK3PXP',
        passkeys:[{id:'FAKE-PASSKEY'}]},extraFields:[]}},
    {state:1,contentFormatVersion:8,data:{type:'note',
      metadata:{name:'Synthetic Proton note',note:'NOT-A-PRIVATE-NOTE'},
      content:{},extraFields:[]}},
    {state:1,contentFormatVersion:8,data:{type:'creditCard',
      metadata:{name:'Fake card'},content:{}}},
    {state:2,contentFormatVersion:8,data:{type:'note',
      metadata:{name:'Deleted note'},content:{}}}
  ]}}});

test('Proton extracted plaintext JSON imports only supported items and encrypts them',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create vault'}).click();
  let confirmed=false;
  page.on('dialog',dialog=>{
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('2 supported Proton Pass logins/notes');
    expect(dialog.message()).toContain('1 passkeys');
    expect(dialog.message()).not.toContain('NOT-REAL-PROTON-PASSWORD');
    confirmed=true;
    return dialog.accept();
  });
  await page.getByLabel('Proton Pass plaintext data.json file').setInputFiles({
    name:'data.json',mimeType:'application/json',buffer:Buffer.from(source)
  });
  await expect(page.getByRole('button',{name:/Synthetic Proton login/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Synthetic Proton note/})).toBeVisible();
  expect(confirmed).toBe(true);
  const raw=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(raw).not.toContain('NOT-REAL-PROTON-PASSWORD');
  expect(raw).not.toContain('NOT-A-PRIVATE-NOTE');
  await page.getByRole('button',{name:'Lock vault'}).click();
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock securely'}).click();
  await expect(page.getByRole('button',{name:/Synthetic Proton login/})).toBeVisible();
});
test('unsupported Proton schema does not replace previous encrypted vault',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create vault'}).click();
  await expect(page.getByRole('heading',{name:/All items/})).toBeVisible();
  await expect.poll(()=>page.evaluate(
    ()=>localStorage.getItem('goreecloud.vault.encrypted.v1')
  )).not.toBeNull();
  const before=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  await page.getByLabel('Proton Pass plaintext data.json file').setInputFiles({
    name:'data.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify({version:'1.40.2',vaults:{
      fake:{name:'X',items:[{state:1,contentFormatVersion:99,
        data:{type:'login',metadata:{name:'Fake'},content:{}}}]}}}))
  });
  await expect(page.getByRole('status')).toContainText('Proton Pass import rejected');
  const after=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(after).toEqual(before);
});
