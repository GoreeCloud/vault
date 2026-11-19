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

test('Firefox popup encrypted backup restore rejects wrong password and relocks', async({page})=>{
  await page.addInitScript(()=>{
    const storage:Record<string,unknown>={};
    Object.defineProperty(window,'browser',{value:{
      storage:{local:{
        get:async(key:string)=>({[key]:storage[key]}),
        set:async(values:Record<string,unknown>)=>Object.assign(storage,values)
      }},
      tabs:{query:async()=>[{id:77,url:'https://example.invalid/login'}]},
      scripting:{executeScript:async()=>[{result:true}]}
    }});
  });
  const master='synthetic-firefox-backup-password-only';
  await page.goto('/popup.html');
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Create encrypted vault'}).click();

  async function note(name:string) {
    await page.getByRole('button',{name:'+ Secure note'}).click();
    await page.getByLabel('Title').fill(name);
    await page.getByLabel('Encrypted notes').fill('FAKE NOTE NO SECRETS');
    await page.getByRole('button',{name:'Save encrypted'}).click();
    await expect(page.getByRole('button',{name:new RegExp(name)})).toBeVisible();
  }
  await note('Synthetic alpha');
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button',{name:/Encrypted backup/}).click()
  ]);
  const buffer=await (await import('node:fs/promises')).readFile(await download.path());
  expect(buffer.toString('utf8')).not.toContain('FAKE NOTE NO SECRETS');
  await note('Synthetic beta');

  const input=page.locator('main .bottom-actions input[type=file]');
  page.once('dialog',dialog=>dialog.accept('wrong-password'));
  await input.setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer});
  await expect(page.getByRole('status')).toContainText('Import rejected');
  await expect(page.getByRole('button',{name:/Synthetic beta/})).toBeVisible();

  page.on('dialog',dialog=>{
    if(dialog.type()==='prompt')return dialog.accept(master);
    if(dialog.type()==='confirm')return dialog.accept();
    return dialog.dismiss();
  });
  await input.setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer});
  await expect(page.getByRole('heading',{name:'Unlock vault'})).toBeVisible();
  await page.getByLabel('Master password').fill(master);
  await page.getByRole('button',{name:'Unlock'}).click();
  await expect(page.getByRole('button',{name:/Synthetic alpha/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Synthetic beta/})).toHaveCount(0);
});

test('Firefox popup imports Bitwarden personal login and note and never persists plaintext',async({page})=>{
  await page.addInitScript(()=>{
    const storage:Record<string,unknown>={};
    Object.defineProperty(window,'__bitwardenSyntheticStorage',{value:storage});
    Object.defineProperty(window,'browser',{value:{
      storage:{local:{
        get:async(key:string)=>({[key]:storage[key]}),
        set:async(values:Record<string,unknown>)=>Object.assign(storage,values),
      }},
      tabs:{query:async()=>[{id:77,url:'https://example.invalid/login'}]},
      scripting:{executeScript:async()=>[{result:true}]}
    }});
  });
  await page.goto('/popup.html');
  await page.getByLabel('Master password').fill('synthetic-firefox-bitwarden-master');
  await page.getByRole('button',{name:'Create encrypted vault'}).click();
  const source=JSON.stringify({
    encrypted:false,
    items:[
      {type:1,name:'Synthetic migrated login',login:{
        username:'fake',password:'NO-REAL-SECRET',uris:[{uri:'https://example.invalid'}]
      }},
      {type:2,name:'Synthetic migrated note',notes:'NOT-PRIVATE-NOTES',secureNote:{}}
    ]
  });
  let confirmed=false;
  page.on('dialog',dialog=>{
    expect(dialog.message()).toContain('2 login/note items');
    confirmed=true;
    return dialog.accept();
  });
  await page.getByLabel('Bitwarden plaintext JSON file').setInputFiles({
    name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(source)
  });
  await expect(page.getByRole('button',{name:/Synthetic migrated login/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Synthetic migrated note/})).toBeVisible();
  expect(confirmed).toBe(true);
  const encrypted=await page.evaluate(()=>JSON.stringify(
    (window as unknown as {__bitwardenSyntheticStorage:Record<string,unknown>}).__bitwardenSyntheticStorage
  ));
  expect(encrypted).not.toContain('NO-REAL-SECRET');
  expect(encrypted).not.toContain('NOT-PRIVATE-NOTES');
  await page.getByTitle('Lock extension vault').click();
  await page.getByLabel('Master password').fill('synthetic-firefox-bitwarden-master');
  await page.getByRole('button',{name:'Unlock'}).click();
  await expect(page.getByRole('button',{name:/Synthetic migrated note/})).toBeVisible();
});

test('Firefox popup automatically locks after five minutes of inactivity',async({page})=>{
  await page.clock.install();
  await page.addInitScript(()=>{
    const storage:Record<string,unknown>={};
    Object.defineProperty(window,'browser',{value:{
      storage:{local:{
        get:async(key:string)=>({[key]:storage[key]}),
        set:async(values:Record<string,unknown>)=>Object.assign(storage,values),
      }},
      tabs:{query:async()=>[{id:77,url:'https://example.invalid/login'}]},
      scripting:{executeScript:async()=>[{result:true}]}
    }});
  });
  await page.goto('/popup.html');
  await page.getByLabel('Master password').fill('synthetic-firefox-idle-password');
  await page.getByRole('button',{name:'Create encrypted vault'}).click();
  await expect(page.getByRole('heading',{name:/My vault/})).toBeVisible();
  await page.clock.fastForward(301_000);
  await expect(page.getByRole('heading',{name:'Unlock vault'})).toBeVisible();
});
