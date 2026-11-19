import {afterEach,expect,test,vi} from 'vitest';
import {matchingHttpsOrigin,fillActiveDocument} from './autofill';

afterEach(()=>vi.unstubAllGlobals());

test('only exact HTTPS origin can be used for autofill',()=>{
  expect(matchingHttpsOrigin('https://login.example.invalid/auth',
    'https://login.example.invalid/path')).toBe('https://login.example.invalid');
  expect(matchingHttpsOrigin('https://example.invalid','https://evil.example.invalid')).toBeNull();
  expect(matchingHttpsOrigin('http://example.invalid','http://example.invalid')).toBeNull();
  expect(matchingHttpsOrigin('https://example.invalid','https://example.invalid.evil.test')).toBeNull();
  expect(matchingHttpsOrigin('https://example.invalid','https://example.invalid:444')).toBeNull();
  expect(matchingHttpsOrigin('https://user@example.invalid','https://example.invalid')).toBeNull();
  expect(matchingHttpsOrigin('https://example.invalid','https://example.invalid@evil.test')).toBeNull();
});

test('injected function rejects navigated origins before touching DOM',()=>{
  let reads=0;
  vi.stubGlobal('location',{origin:'https://different.example.invalid'});
  vi.stubGlobal('document',{querySelector:()=>{reads++;return {}; }});
  expect(fillActiveDocument('https://example.invalid','fake-user','FAKE')).toBe(false);
  expect(reads).toBe(0);
});

test('injected function fills only active form fields and never submits',()=>{
  const events:string[]=[];
  class FakeInput {
    private current='';
    disabled=false;
    readOnly=false;
    isConnected=true;
    form:{querySelector:()=>FakeInput}|null=null;
    get value(){return this.current;}
    set value(next:string){this.current=next;}
    dispatchEvent(event:{type:string}){events.push(event.type);return true;}
  }
  const username=new FakeInput();
  const password=new FakeInput();
  password.form={querySelector:()=>username};
  let queried=0;
  vi.stubGlobal('HTMLInputElement',FakeInput);
  vi.stubGlobal('Event',class{constructor(public type:string){}});
  vi.stubGlobal('location',{origin:'https://example.invalid'});
  vi.stubGlobal('document',{querySelector:()=>{
    queried++;return password;
  }});
  expect(fillActiveDocument('https://example.invalid','fake-user','SYNTHETIC-ONLY')).toBe(true);
  expect(username.value).toBe('fake-user');
  expect(password.value).toBe('SYNTHETIC-ONLY');
  expect(queried).toBe(1);
  expect(events).toEqual(['input','change','input','change']);
});
