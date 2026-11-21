import {expect,test} from '@playwright/test';

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
});
