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
