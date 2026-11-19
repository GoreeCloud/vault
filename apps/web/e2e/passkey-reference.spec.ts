import {expect,test} from '@playwright/test';

test('web editor refuses public-suffix passkey references before encrypted storage',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Master password').fill('synthetic-only-rp-scope-password');
  await page.getByRole('button',{name:'Create vault'}).click();
  await page.locator('.quick-create').getByRole('button',{name:/Passkey reference/}).click();
  await page.locator('form.editor input[required]').fill('Synthetic RP reference');
  await page.getByLabel('Relying-party domain').fill('github.io');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('alert')).toContainText('registrable RP domain');
  await page.getByLabel('Relying-party domain').fill('Foo.GitHub.io');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('button',{name:/Synthetic RP reference/})).toBeVisible();
  const encrypted=await page.evaluate(()=>localStorage.getItem('goreecloud.vault.encrypted.v1'));
  expect(encrypted).not.toContain('foo.github.io');
});
