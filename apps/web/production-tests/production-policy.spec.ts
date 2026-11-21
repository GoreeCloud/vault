import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

/** Real browser smoke of generated production assets with synthetic credentials.
 * No deployment and no real passwords, sites or user vault files.
 */
test('production bundle creates encrypted local data without network access',async({page})=>{
  await page.goto('/');
  const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  expect(csp).toContain("connect-src 'none'");
  expect(csp).toContain("worker-src 'none'");
  expect(csp).toContain("frame-src 'none'");
  const master='SYNTHETIC-PRODUCTION-CSP-TEST-NOT-REAL';
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create vault'}).click();
  await expect(page.getByRole('heading',{name:/All items/})).toBeVisible();
  const ciphertext=await page.evaluate(
    ()=>localStorage.getItem('goreecloud.vault.encrypted.v1')
  );
  expect(ciphertext).toContain('goreecloud-vault');
  expect(ciphertext).not.toContain(master);
  const requestWasBlocked=await page.evaluate(async()=>{
    try{
      await fetch('/synthetic-must-be-blocked',{method:'GET'});
      return false;
    }catch{
      return true;
    }
  });
  expect(requestWasBlocked).toBe(true);
  // Verify that network-deny CSP does not accidentally disable local
  // encrypted note writes and the explicit Blob download recovery path.
  await page.locator('.quick-create').getByRole('button',{name:/Secure note/}).click();
  await page.locator('.editor input[required]').fill('Synthetic production note');
  await page.locator('.editor textarea').fill('NO-REAL-SECRETS-PRODUCTION-CSP');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('button',{name:/Synthetic production note/})).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:/Export encrypted backup/}).click(),
  ]);
  expect(download.suggestedFilename()).toBe('goreecloud-vault-encrypted.json');
  const backup=await readFile(await download.path());
  expect(backup.toString('utf8')).toContain('goreecloud-vault');
  expect(backup.toString('utf8')).not.toContain('NO-REAL-SECRETS-PRODUCTION-CSP');
});
