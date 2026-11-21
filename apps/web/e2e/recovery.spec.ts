import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const master='synthetic-e2e-master-password-never-use';
const backupName='goreecloud-vault-encrypted.json';
async function initialize(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create vault'}).click();
  await expect(page.getByRole('heading',{name:/All items/})).toBeVisible();
}
async function createNote(page: import('@playwright/test').Page,title:string,body:string) {
  await page.getByRole('button',{name:'Secure note',exact:false}).filter({hasText:'+ Secure note'}).first().click();
  await page.locator('.editor input[required]').fill(title);
  await page.locator('.editor textarea').fill(body);
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('button',{name:new RegExp(title)})).toBeVisible();
}

test('encrypted backup exports, rejects wrong password and restores only after consent',async({page})=>{
  await initialize(page);
  await createNote(page,'Synthetic alpha','NOT-A-REAL-PRIVATE-NOTE');
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:/Export encrypted backup/}).click()
  ]);
  expect(download.suggestedFilename()).toBe(backupName);
  const bytes=await readFile(await download.path());
  const envelope=JSON.parse(bytes.toString('utf8'));
  expect(envelope.format).toBe('goreecloud-vault');
  expect(envelope.cipher.name).toBe('aes-256-gcm');
  expect(bytes.toString('utf8')).not.toContain('NOT-A-REAL-PRIVATE-NOTE');
  await createNote(page,'Synthetic beta','SECOND TEST NOTE');
  const input=page.locator('aside label.import-label').first().locator('input[type=file]');

  page.once('dialog',dialog=>dialog.accept('incorrect-master-password'));
  await input.setInputFiles({name:backupName,mimeType:'application/json',buffer:bytes});
  await expect(page.getByRole('status')).toContainText('Restore failed');
  await expect(page.getByRole('button',{name:/Synthetic beta/})).toBeVisible();

  page.on('dialog',dialog=>{
    if (dialog.type()==='prompt') return dialog.accept(master);
    if (dialog.type()==='confirm') return dialog.accept();
    return dialog.dismiss();
  });
  await input.setInputFiles({name:backupName,mimeType:'application/json',buffer:bytes});
  // Backup replacement now deliberately requires a fresh unlock.
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock securely'}).click();
  await expect(page.getByRole('button',{name:/Synthetic alpha/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Synthetic beta/})).toHaveCount(0);
  await page.getByRole('button',{name:'Lock vault'}).click();
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock securely'}).click();
  await expect(page.getByRole('button',{name:/Synthetic alpha/})).toBeVisible();
});

test('secure note and authenticator remain encrypted with supported OTP',async({page})=>{
  await initialize(page);
  await createNote(page,'Synthetic recovery note','IRREPLACEABLE-NOT-REAL-DATA');
  await page.locator('.quick-create').getByRole('button',{name:/Authenticator/}).click();
  await page.locator('.editor input[required]').fill('Synthetic OTP');
  await page.locator('.editor input[type=password]').fill('JBSWY3DPEHPK3PXP');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  const ciphertext = await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(ciphertext).not.toContain('IRREPLACEABLE-NOT-REAL-DATA');
  expect(ciphertext).not.toContain('JBSWY3DPEHPK3PXP');
  await expect(page.getByRole('button',{name:/Synthetic OTP/}).first()).toBeVisible();
});


test('hiding browser during master-key derivation cannot reopen or persist a new vault', async({page})=>{
  await page.goto('/');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create vault'}).click();
  await page.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading',{name:'Create an encrypted vault'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Create vault'})).toBeEnabled({timeout:10000});
  expect(await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'))).toBeNull();
});

test('hiding browser while unlocking cannot expose the decrypted dashboard',async({page})=>{
  await initialize(page);
  await page.getByRole('button',{name:'Lock vault'}).click();
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock securely'}).click();
  await page.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Unlock securely'})).toBeEnabled({timeout:10000});
  await expect(page.getByRole('heading',{name:/All items/})).toHaveCount(0);
});


test('five minutes without interaction automatically locks the unlocked vault', async({page})=>{
  await page.clock.install();
  await initialize(page);
  await page.clock.fastForward(301_000);
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await expect(page.getByRole('heading',{name:/All items/})).toHaveCount(0);
});

test('explicit interaction resets the inactivity timer',async({page})=>{
  await page.clock.install();
  await initialize(page);
  await page.clock.fastForward(240_000);
  await page.getByRole('textbox',{name:'Search encrypted items'}).fill('synthetic');
  await page.clock.fastForward(120_000);
  await expect(page.getByRole('heading',{name:/All items/})).toBeVisible();
  await page.clock.fastForward(181_000);
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
});

test('external encrypted replacement cannot be silently overwritten by an unlocked web editor', async({page})=>{
  await initialize(page);
  await page.locator('.quick-create').getByRole('button',{name:/Secure note/}).click();
  await page.locator('.editor input[required]').fill('Stale synthetic note');
  await page.locator('.editor textarea').fill('NOT-PRIVATE-PENDING-NOTE');
  const externallyChanged=await page.evaluate(()=>{
    const key='goreecloud.vault.encrypted.v1';
    const current=JSON.parse(localStorage.getItem(key)!);
    // Simulates another authorized writer changing the encrypted envelope,
    // without creating, disclosing or storing any real credentials.
    current.cipher.nonce='AQAAAAAAAAAAAAAA';
    const changed=JSON.stringify(current);
    localStorage.setItem(key,changed);
    return changed;
  });
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Encrypted vault changed');
  expect(await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1')))
    .toBe(externallyChanged);
});

test('storage changes from a different tab immediately lock an unlocked web vault', async({page,context})=>{
  await initialize(page);
  const other=await context.newPage();
  await other.goto('/');
  await other.evaluate(()=>{
    const key='goreecloud.vault.encrypted.v1';
    const current=JSON.parse(localStorage.getItem(key)!);
    current.cipher.nonce='AQAAAAAAAAAAAAAA';
    localStorage.setItem(key,JSON.stringify(current));
  });
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Encrypted vault changed in another tab');
  await other.close();
});

test('conflicting OTP issuer URI cannot alter encrypted web vault',async({page})=>{
  await initialize(page);
  const before=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  await page.locator('.quick-create').getByRole('button',{name:/Authenticator/}).click();
  await page.locator('.editor input[required]').fill('Synthetic rejected OTP');
  await page.getByLabel('Authenticator (Base32 secret or otpauth:// URI)').fill(
    'otpauth://totp/Trusted:fake?secret=JBSWY3DPEHPK3PXP&issuer=Other');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('alert')).toContainText('Invalid OTP');
  expect(await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1')))
    .toBe(before);
  await page.getByLabel('Authenticator (Base32 secret or otpauth:// URI)').fill(
    'otpauth://totp/Trusted:fake?secret=JBSWY3DPEHPK3PXP&issuer=Trusted');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('button',{name:/Synthetic rejected OTP/})).toBeVisible();
  const encrypted=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(encrypted).not.toContain('JBSWY3DPEHPK3PXP');
});

test('corrupt local vault preserves raw bytes and recovers after verified encrypted restore',async({page})=>{
  await initialize(page);
  await createNote(page,'Synthetic recovered note','RECOVERY-FIXTURE-NOT-PRIVATE');
  const validBackup=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(validBackup).toContain('goreecloud-vault');
  expect(validBackup).not.toContain('RECOVERY-FIXTURE-NOT-PRIVATE');

  const corrupted='MALFORMED-LOCAL-SYNTHETIC-ENVELOPE-DO-NOT-USE';
  await page.evaluate(value=>
    localStorage.setItem('goreecloud.vault.encrypted.v1',value),corrupted);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Encrypted data needs attention.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Create vault'})).toHaveCount(0);

  page.once('dialog',dialog=>dialog.accept());
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:'Preserve unverified storage'}).click(),
  ]);
  expect(download.suggestedFilename()).toBe('goreecloud-vault-damaged-unverified.txt');
  expect((await readFile(await download.path())).toString()).toBe(corrupted);
  const input=page.getByLabel('Recovery encrypted backup JSON file');

  page.once('dialog',dialog=>dialog.dismiss());
  await input.setInputFiles({
    name:backupName,mimeType:'application/json',buffer:Buffer.from(validBackup!),
  });
  await expect(page.getByRole('heading',{name:'Encrypted data needs attention.'})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'))).toBe(corrupted);

  page.once('dialog',dialog=>dialog.accept('incorrect-backup-password'));
  await input.setInputFiles({
    name:backupName,mimeType:'application/json',buffer:Buffer.from(validBackup!),
  });
  await expect(page.getByRole('alert')).toContainText('Restore failed');
  expect(await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'))).toBe(corrupted);

  page.on('dialog',dialog=>{
    if(dialog.type()==='prompt')return dialog.accept(master);
    if(dialog.type()==='confirm')return dialog.accept();
    return dialog.dismiss();
  });
  await input.setInputFiles({
    name:backupName,mimeType:'application/json',buffer:Buffer.from(validBackup!),
  });
  await expect(page.getByRole('heading',{name:'Unlock your vault'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Encrypted backup restored');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock securely'}).click();
  await expect(page.getByRole('button',{name:/Synthetic recovered note/})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1')))
    .not.toBe(corrupted);
});
