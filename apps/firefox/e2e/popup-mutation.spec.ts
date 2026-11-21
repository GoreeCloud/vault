import {expect,test} from '@playwright/test';

/** Concurrent popup events are synthetic; this does not prove atomic
 * coordination across separate extension windows or processes.
 */
test('rapid duplicate popup submissions initiate only one ciphertext write',async({page})=>{
  await page.addInitScript(()=>{
    const vault:Record<string,unknown>={};
    const gate={
      calls:0,
      blocked:false,
      waiting:false,
      release:null as null|(()=>void),
    };
    Object.defineProperty(window,'__singleWriterState',{value:{vault,gate}});
    Object.defineProperty(window,'browser',{value:{
      storage:{local:{
        get:async(key:string)=>({[key]:vault[key]}),
        set:async(values:Record<string,unknown>)=>{
          gate.calls++;
          if(gate.blocked){
            gate.waiting=true;
            await new Promise<void>(resolve=>{gate.release=resolve;});
            gate.waiting=false;
          }
          Object.assign(vault,values);
        },
      }},
      tabs:{query:async()=>[{id:82,url:'https://example.invalid/login'}]},
      scripting:{executeScript:async()=>[{result:true}]},
    }});
  });
  await page.goto('/popup.html');
  await page.getByLabel('Master password').fill('synthetic-rapid-submit-password-only');
  await page.getByRole('button',{name:'Create encrypted vault'}).click();
  await expect(page.getByRole('heading',{name:/My vault/})).toBeVisible();
  await page.getByRole('button',{name:'+ Secure note'}).click();
  await page.getByLabel('Title').fill('Single synthetic mutation');
  await page.getByLabel('Encrypted notes').fill('SYNTHETIC-ONLY-NO-SECRETS');
  await page.evaluate(()=>{
    (window as unknown as {
      __singleWriterState:{gate:{blocked:boolean}}
    }).__singleWriterState.gate.blocked=true;
    const form=document.querySelector('form.editor')!;
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  });
  await page.waitForFunction(()=>(window as unknown as {
    __singleWriterState:{gate:{waiting:boolean}}
  }).__singleWriterState.gate.waiting);
  const before=await page.evaluate(()=>(window as unknown as {
    __singleWriterState:{gate:{calls:number}}
  }).__singleWriterState.gate.calls);
  // One initial encrypted vault creation and exactly one note write.
  expect(before).toBe(2);
  await page.evaluate(()=>{
    (window as unknown as {
      __singleWriterState:{gate:{release:(()=>void)|null}}
    }).__singleWriterState.gate.release?.();
  });
  await expect(page.getByRole('button',{name:/Single synthetic mutation/})).toBeVisible();
  const result=await page.evaluate(()=>{
    const {gate,vault}=(window as unknown as {
      __singleWriterState:{gate:{calls:number},vault:Record<string,unknown>}
    }).__singleWriterState;
    return {calls:gate.calls,stored:JSON.stringify(vault)};
  });
  expect(result.calls).toBe(2);
  expect(result.stored).not.toContain('SYNTHETIC-ONLY-NO-SECRETS');
});
