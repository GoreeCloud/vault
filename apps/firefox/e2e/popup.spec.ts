import {test,expect} from '@playwright/test';

/**
 * Browser-facing UI integration with an in-memory WebExtensions API mock.
 * This does not claim real extension installation, permission enforcement or
 * actual in-tab content-script integration. Those need Firefox runtime checks.
 */
test('encrypted popup stores private notes locally and unlocks',async({page})=>{
  await page.addInitScript(()=>{
    const vaultStorage:Record<string,unknown>={};
    Object.defineProperty(window,'__vaultSyntheticState',{value:vaultStorage});
    Object.defineProperty(window,'browser',{value:{
      storage:{local:{
        get:async(key:string)=>({[key]:vaultStorage[key]}),
        set:async(values:Record<string,unknown>)=>Object.assign(vaultStorage,values),
      }},
      tabs:{query:async()=>[{id:77,url:'https://example.invalid/login'}]},
      scripting:{executeScript:async()=>[{result:true}]},
    }});
  });
  const errors:string[]=[];
  page.on('pageerror',(err)=>errors.push(err.message));
  await page.goto('/popup.html');
  await expect(page.getByRole('heading',{name:'Create local vault'})).toBeVisible();
  await page.getByLabel('Master password').fill('synthetic-popup-master-password-long');
  await page.getByRole('button',{name:'Create encrypted vault'}).click();
  await expect(page.getByRole('heading',{name:/My vault/})).toBeVisible();
  await page.getByRole('button',{name:'+ Secure note'}).click();
  await page.getByLabel('Title').fill('Synthetic note');
  await page.getByLabel('Encrypted notes').fill('SYNTHETIC NOTE CONTENT');
  await page.getByLabel('Tags (comma-separated)').fill('synthetic, encrypted');
  await page.getByRole('button',{name:'+ Custom field'}).click();
  await page.getByLabel('Field name').fill('Synthetic field');
  await page.getByLabel('Value', {exact:true}).fill('FAKE-PRIVATE-CUSTOM-VALUE');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await expect(page.getByRole('button',{name:/Synthetic note/})).toBeVisible();
  const raw=await page.evaluate(()=>JSON.stringify((window as unknown as {
    __vaultSyntheticState:Record<string,unknown>
  }).__vaultSyntheticState));
  expect(raw).toContain('goreecloud-vault');
  expect(raw).not.toContain('SYNTHETIC NOTE CONTENT');
  expect(raw).not.toContain('FAKE-PRIVATE-CUSTOM-VALUE');
  expect(raw).not.toContain('synthetic, encrypted');
  await page.getByRole('button',{name:/Synthetic note/}).click();
  await expect(page.getByText('SYNTHETIC NOTE CONTENT')).toBeVisible();
  await expect(page.getByText('••••••')).toBeVisible();
  await page.getByRole('button',{name:'Reveal custom fields'}).click();
  await expect(page.getByText('FAKE-PRIVATE-CUSTOM-VALUE')).toBeVisible();
  await expect(page.getByText('Tags: synthetic, encrypted')).toBeVisible();
  await page.getByTitle('Lock extension vault').click();
  await page.getByLabel('Master password').fill('synthetic-popup-master-password-long');
  await page.getByRole('button',{name:'Unlock'}).click();
  await expect(page.getByRole('button',{name:/Synthetic note/})).toBeVisible();
  expect(errors).toEqual([]);
});

test('popup requires exact HTTPS origin for explicitly requested fill',async({page})=>{
  await page.addInitScript(()=>{
    const storage:Record<string,unknown>={};
    const invoked:{args?:string[]}={};
    Object.defineProperty(window,'__fillSyntheticState',{value:invoked});
    Object.defineProperty(window,'browser',{value:{
      storage:{local:{
        get:async(key:string)=>({[key]:storage[key]}),
        set:async(values:Record<string,unknown>)=>Object.assign(storage,values),
      }},
      tabs:{query:async()=>[{id:12,url:'https://example.invalid/login'}]},
      scripting:{executeScript:async(opts:{args:string[]})=>{
        invoked.args=opts.args;return [{result:true}];
      }},
    }});
  });
  await page.goto('/popup.html');
  await page.getByLabel('Master password').fill('another-synthetic-popup-master-password');
  await page.getByRole('button',{name:'Create encrypted vault'}).click();
  await page.getByRole('button',{name:'+ Login'}).click();
  await page.getByLabel('Title').fill('Synthetic login');
  await page.getByLabel('Username').fill('fake@example.invalid');
  await page.getByLabel('Password').fill('NOT-A-REAL-PASSWORD');
  await page.getByLabel('Exact HTTPS website').fill('https://example.invalid/account');
  await page.getByRole('button',{name:'Save encrypted'}).click();
  await page.getByRole('button',{name:/Synthetic login/}).click();
  await page.getByRole('button',{name:'Fill current HTTPS site'}).click();
  const args=await page.evaluate(()=>(
    window as unknown as {__fillSyntheticState:{args?:string[]}}
  ).__fillSyntheticState.args);
  expect(args).toEqual(['https://example.invalid','fake@example.invalid','NOT-A-REAL-PASSWORD']);
  await expect(page.getByRole('status')).toContainText('Credentials filled');
});
