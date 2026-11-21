import {expect,test} from '@playwright/test';

/** Real Firefox DOM tests of the injected function through the Vite server.
 * Not WebExtensions permission enforcement or signed add-on acceptance.
 */
test('fills one visible login form without submitting', async({page})=>{
  await page.goto('/popup.html');
  await page.setContent([
    '<form id="login" action="/never-submit">',
    '<input id="username" name="username" autocomplete="username">',
    '<input id="password" type="password" autocomplete="current-password">',
    '<button type="submit">Submit</button></form>'
  ].join(''));
  const result=await page.evaluate(async()=>{
    const {fillActiveDocument}=await import('/src/autofill.ts');
    let submitted=0;
    document.querySelector('form')!.addEventListener('submit',e=>{
      e.preventDefault();submitted++;
    });
    const ok=fillActiveDocument(location.origin,'SYNTHETIC-USER','NOT-A-REAL-PASSWORD');
    return {
      ok,submitted,
      user:(document.querySelector('#username') as HTMLInputElement).value,
      pass:(document.querySelector('#password') as HTMLInputElement).value,
    };
  });
  expect(result).toEqual({
    ok:true,submitted:0,user:'SYNTHETIC-USER',pass:'NOT-A-REAL-PASSWORD'
  });
});

test('skips hidden templates and refuses multiple visible password fields',async({page})=>{
  await page.goto('/popup.html');
  await page.setContent([
    '<form id="hidden"><input id="honeypot" type="password" style="display:none"></form>',
    '<form id="login"><input id="username" autocomplete="username">',
    '<input id="password" type="password"></form>'
  ].join(''));
  const result=await page.evaluate(async()=>{
    const {fillActiveDocument}=await import('/src/autofill.ts');
    const first=fillActiveDocument(location.origin,'FAKE-USER','SYNTHETIC-ONLY');
    const honeypot=(document.querySelector('#honeypot') as HTMLInputElement).value;
    const visible=(document.querySelector('#password') as HTMLInputElement);
    const visibleBefore=visible.value;
    const another=document.createElement('input');
    another.type='password';another.id='second-password';
    document.querySelector('#login')!.appendChild(another);
    const second=fillActiveDocument(location.origin,'ANOTHER-USER','SHOULD-NOT-FILL');
    return {first,honeypot,visibleBefore,second,visibleAfter:visible.value,
      secondValue:another.value};
  });
  expect(result).toEqual({
    first:true,honeypot:'',visibleBefore:'SYNTHETIC-ONLY',second:false,
    visibleAfter:'SYNTHETIC-ONLY',secondValue:''
  });
});

test('new-password, ambiguous usernames and wrong origins receive nothing',async({page})=>{
  await page.goto('/popup.html');
  await page.setContent([
    '<form id="login"><input id="email" type="email">',
    '<input id="username" autocomplete="username">',
    '<input id="password" type="password" autocomplete="new-password"></form>'
  ].join(''));
  const result=await page.evaluate(async()=>{
    const {fillActiveDocument}=await import('/src/autofill.ts');
    const wrongOrigin=fillActiveDocument('https://not-our-synthetic-origin.invalid',
      'FAKE','FAKE-PASS');
    const newPassword=fillActiveDocument(location.origin,'FAKE','FAKE-PASS');
    const pwd=document.querySelector('#password') as HTMLInputElement;
    pwd.autocomplete='current-password';
    const ambiguousUsernames=fillActiveDocument(location.origin,'FAKE','FAKE-PASS');
    return {wrongOrigin,newPassword,ambiguousUsernames,pwd:pwd.value,
      email:(document.querySelector('#email') as HTMLInputElement).value,
      username:(document.querySelector('#username') as HTMLInputElement).value};
  });
  expect(result).toEqual({
    wrongOrigin:false,newPassword:false,ambiguousUsernames:false,
    pwd:'',email:'',username:''
  });
});
