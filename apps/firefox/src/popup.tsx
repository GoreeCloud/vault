import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {encryptEntries, initialize, parseEnvelope, randomId, unlock, generatePassword,
  type Entry, type VaultEnvelope, type VaultKind} from '../../web/src/crypto';
import {parseOtp, generateOtp} from '../../web/src/otp';
import {matchingHttpsOrigin, fillActiveDocument} from './autofill';
import {bitwardenImportWarning,parseBitwardenPlaintextJson} from '../../web/src/import_bitwarden';
import './style.css';

type BrowserTab = {id?: number; url?: string};
type ScriptingResult = {result?: boolean};
declare const browser: {
  storage: {local: {
    get(key:string): Promise<Record<string,unknown>>;
    set(values:Record<string,unknown>): Promise<void>;
  }};
  tabs: {
    query(options:{active:boolean;currentWindow:boolean}):Promise<BrowserTab[]>;
    create(options:{url:string}):Promise<void>;
  };
  scripting:{executeScript(options:{target:{tabId:number};func:typeof fillActiveDocument;
    args:[string,string,string]}):Promise<ScriptingResult[]>};
};

const STORAGE_KEY='goreecloud.vault.encrypted.v1';
const initial = (kind:VaultKind):Entry=>({
  id:randomId(),title:'',username:'',password:'',website:'',notes:'',kind,customFields:[],tags:[]
});
const kindName:Record<VaultKind,string>={login:'Login',note:'Secure note',otp:'Authenticator',passkey:'Passkey reference'};

function Extension() {
  const key=useRef<CryptoKey|null>(null);
  const lockEpoch=useRef(0);
  // Never re-open a locked popup after a pending KDF/storage/tab promise resolves.
  const active=(epoch:number)=>lockEpoch.current===epoch&&document.visibilityState==='visible';
  const [loaded,setLoaded]=useState(false);
  const [envelope,setEnvelope]=useState<VaultEnvelope|null>(null);
  const [corrupt,setCorrupt]=useState(false);
  const [items,setItems]=useState<Entry[]|null>(null);
  const [master,setMaster]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState<Entry|null>(null);
  const [edit,setEdit]=useState<Entry|null>(null);
  const [otpText,setOtpText]=useState('');
  const [code,setCode]=useState('');
  const [revealCustom,setRevealCustom]=useState(false);
  const [tab,setTab]=useState<BrowserTab|null>(null);
  useEffect(()=>{
    void (async()=>{
      try {
        const values=await browser.storage.local.get(STORAGE_KEY);
        const raw=values[STORAGE_KEY];
        if (raw !== undefined) {
          try { setEnvelope(parseEnvelope(JSON.stringify(raw))); } catch {setCorrupt(true);}
        }
        setTab((await browser.tabs.query({active:true,currentWindow:true}))[0]??null);
      }catch{setError('Browser storage is unavailable. No changes were made.');}
      finally{setLoaded(true);}
    })();
  },[]);

  async function open(event:React.FormEvent) {
    event.preventDefault();
    if(corrupt||busy)return;
    const epoch=lockEpoch.current;
    setBusy(true);setError('');
    try{
      if(envelope){
        // Re-read ciphertext after a potentially stale/aborted storage write.
        const stored=(await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
        if(!active(epoch))return;
        const current=parseEnvelope(JSON.stringify(stored));
        const opened=await unlock(master,current);
        if(!active(epoch))return;
        key.current=opened.key;setEnvelope(current);setItems(opened.entries);
      }else{
        const result=await initialize(master);
        if(!active(epoch))return;
        await browser.storage.local.set({[STORAGE_KEY]:result.envelope});
        if(!active(epoch))return;
        key.current=result.key;setEnvelope(result.envelope);setItems([]);
      }
      setMaster('');
    }catch{
      if(active(epoch))setError('Could not open vault. Verify password and storage integrity.');
    }finally{setBusy(false);}
  }
  async function save(next:Entry[]):Promise<boolean>{
    if(!key.current||!envelope||busy)return false;
    const epoch=lockEpoch.current;
    const sessionKey=key.current;
    setBusy(true);setError('');
    try{
      const value=await encryptEntries(next,sessionKey,envelope.kdf.salt);
      if(!active(epoch))return false;
      await browser.storage.local.set({[STORAGE_KEY]:value});
      if(!active(epoch))return false;
      setEnvelope(value);setItems(next);setEdit(null);setSelected(null);
      return true;
    }catch{
      if(active(epoch))setError('Save failed. Check the encrypted vault before retrying.');
      return false;
    }finally{setBusy(false);}
  }
  function lock() {
    lockEpoch.current++;
    key.current=null;setItems(null);setSelected(null);setEdit(null);
    // Keep busy while any already-dispatched ciphertext write is pending.
    // An explicit unlock must wait for it, then re-read authoritative storage.
    setMaster('');setCode('');
  }

  useEffect(()=>{
    if(items===null)return;
    const maxIdleMs=5*60*1000;
    let timer=window.setTimeout(lock,maxIdleMs);
    const refresh=()=>{
      window.clearTimeout(timer);
      timer=window.setTimeout(lock,maxIdleMs);
    };
    document.addEventListener('pointerdown',refresh,true);
    document.addEventListener('keydown',refresh,true);
    document.addEventListener('input',refresh,true);
    return()=>{
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown',refresh,true);
      document.removeEventListener('keydown',refresh,true);
      document.removeEventListener('input',refresh,true);
    };
  },[items]);

  function exportFile(){
    if(!envelope)return;
    const blob=new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'});
    const link=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=link;a.download='goreecloud-vault-firefox-encrypted.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(link),1000);
  }
  async function restore(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    event.target.value='';if(!file||busy)return;
    const password=window.prompt('Master password of encrypted backup:');
    if(password===null)return;
    const epoch=lockEpoch.current;
    setBusy(true);setError('');
    try{
      if(file.size>5_000_000)throw Error('too large');
      const value=parseEnvelope(await file.text());
      if(!active(epoch))return;
      await unlock(password,value);
      if(!active(epoch))return;
      if(!window.confirm('Replace all encrypted items in this Firefox profile? Export a backup first.'))return;
      if(!active(epoch))return;
      await browser.storage.local.set({[STORAGE_KEY]:value});
      if(!active(epoch))return;
      lock();setEnvelope(value);setCorrupt(false);
      setError('Encrypted backup restored. Unlock with its master password.');
    }catch{
      if(active(epoch))setError('Import rejected. Wrong password or invalid encrypted backup. Existing vault should be checked.');
    }finally{setBusy(false);}
  }
  async function importBitwarden(event:React.ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file || items===null || !key.current || !envelope || busy)return;
    if(file.size===0 || file.size>5_000_000){
      setError('Bitwarden plaintext JSON must be between 1 byte and 5 MB.');return;
    }
    const epoch=lockEpoch.current;
    const sessionKey=key.current;
    setBusy(true);setError('');
    try {
      const text=await file.text();
      if(!active(epoch))return;
      const preview=parseBitwardenPlaintextJson(text,randomId);
      if(items.length+preview.entries.length>20_000)throw Error('Too many items');
      if(!window.confirm(bitwardenImportWarning(preview)))return;
      if(!active(epoch))return;
      // Encrypt before the one explicit extension-storage write.
      const next=[...items,...preview.entries];
      const encrypted=await encryptEntries(next,sessionKey,envelope.kdf.salt);
      if(!active(epoch))return;
      await browser.storage.local.set({[STORAGE_KEY]:encrypted});
      if(!active(epoch))return;
      setEnvelope(encrypted);setItems(next);setSelected(null);setEdit(null);
      setError('Bitwarden login/note items encrypted locally. Review imported records.');
    }catch{
      if(active(epoch))setError('Bitwarden import rejected. Inspect the encrypted vault before retrying.');
    }finally{setBusy(false);}
  }
  async function fill(item:Entry) {
    if(item.kind&&item.kind!=='login')return;
    if(tab?.id===undefined||!tab.url){setError('No active website tab.');return;}
    const origin=matchingHttpsOrigin(item.website,tab.url);
    if(!origin){setError('Autofill blocked: saved site must match this HTTPS origin exactly.');return;}
    const epoch=lockEpoch.current;
    try{
      // Re-read the active tab before injecting secrets, and check inside the tab as well.
      const currentTab=(await browser.tabs.query({active:true,currentWindow:true}))[0];
      if(!active(epoch)||!key.current)return;
      if(currentTab.id!==tab.id||!currentTab.url||matchingHttpsOrigin(item.website,currentTab.url)!==origin)
        throw Error('Tab changed');
      const results=await browser.scripting.executeScript({
        target:{tabId:tab.id},func:fillActiveDocument,args:[origin,item.username,item.password]
      });
      if(!active(epoch))return;
      setError(results[0]?.result?'Credentials filled. Review before submitting.':
        'No safe password field found. Nothing was submitted.');
    }catch{
      if(active(epoch))setError('Autofill unavailable in this tab. Nothing was submitted.');
    }
  }
  async function showOtp(item:Entry,copy=false) {
    if(!item.otp||!key.current||!items)return;
    const epoch=lockEpoch.current;
    try{
      const value=await generateOtp(item.otp);
      if(!active(epoch))return;
      if(item.otp.type==='hotp'){
        if(!window.confirm('Use this HOTP? Its encrypted counter will advance.'))return;
        if(!active(epoch))return;
        const updated=items.map(x=>x.id===item.id?{...x,otp:{...item.otp!,counter:item.otp!.counter+1}}:x);
        if(!await save(updated)||!active(epoch))return;
      }
      if(!active(epoch))return;
      setCode(value);
      if(copy){
        await navigator.clipboard.writeText(value);
        if(active(epoch))setError('OTP copied. Clipboard contents may persist.');
      }
    }catch{if(active(epoch))setError('Unable to generate or copy OTP.');}
  }
  async function submitEdit(e:React.FormEvent){
    e.preventDefault();if(!edit||!items)return;
    let next={...edit};
    if(!next.title.trim()){setError('Title is required.');return;}
    if(next.kind==='otp'||otpText.trim()){
      try{next.otp=edit.otp?.secret===otpText.trim()?edit.otp:parseOtp(otpText.trim());}
      catch{setError('Invalid OTP secret or otpauth URI.');return;}
    } else {
      // Clearing the authenticator on an existing login must discard the seed.
      delete next.otp;
    }
    await save(items.some(x=>x.id===next.id)?items.map(x=>x.id===next.id?next:x):[...items,next]);
  }
  function newItem(kind:VaultKind){setSelected(null);setEdit(initial(kind));setOtpText('');setRevealCustom(false);setError('');}
  function editing(item:Entry){setSelected(null);setEdit({...item});setOtpText(item.otp?.secret??'');setRevealCustom(false);setError('');}

  const visible=(items??[]).filter(x=>[x.title,x.username,x.website].some(y=>y.toLowerCase().includes(search.toLowerCase())));
  return <div className="popup">
    <header><span className="brand-mark">◇</span><div><strong>GoreeCloud Vault</strong><small>FIREFOX · LOCAL ENCRYPTION</small></div>
      {items!==null&&<button className="icon-button" title="Lock extension vault" onClick={lock}>⌑</button>}</header>
    {!loaded?<main><p>Opening encrypted storage…</p></main>:
    corrupt?<main><h2>Recovery required</h2><p>Encrypted data is malformed; it was not overwritten.</p>
      <label className="secondary import-button">Import valid encrypted backup<input type="file" accept=".json" hidden onChange={e=>void restore(e)}/></label>
      {error&&<p role="alert" className="alert">{error}</p>}</main>:
    items===null?<main className="unlock">
      <div className="lock-icon">⌑</div><h1>{envelope?'Unlock vault':'Create local vault'}</h1>
      <p>Nothing leaves this Firefox profile. A master password is needed to decrypt it.</p>
      <form onSubmit={e=>void open(e)}>
        <label>Master password<input type="password" autoFocus required value={master}
          minLength={envelope?1:12} maxLength={1024} onChange={e=>setMaster(e.target.value)}/></label>
        <button className="primary" disabled={busy}>{busy?'Working…':envelope?'Unlock':'Create encrypted vault'}</button>
      </form>
      <label className="secondary import-button">Import encrypted vault<input type="file" accept=".json" hidden onChange={e=>void restore(e)}/></label>
      {error&&<p role="alert" className="alert">{error}</p>}
    </main>:
    <main>
      {!edit&&!selected?<><div className="titlebar"><h1>My vault <span>{items.length}</span></h1>
        <button className="primary compact" onClick={()=>newItem('login')}>+ Add</button></div>
        <div className="quick">{(['login','note','otp','passkey'] as const).map(k=>
          <button key={k} onClick={()=>newItem(k)}>+ {kindName[k]}</button>)}</div>
        <input className="search" value={search} aria-label="Search vault items" placeholder="Search encrypted items"
          onChange={e=>setSearch(e.target.value)}/>
        <div className="list">{visible.length?visible.map(item=><button className="item" key={item.id}
          onClick={()=>{setSelected(item);setCode('');setRevealCustom(false);setError('');}}>
          <span className="glyph">{item.kind==='note'?'▤':item.kind==='otp'?'◷':item.kind==='passkey'?'✧':'◈'}</span>
          <span className="copy"><strong>{item.title}</strong><small>{kindName[item.kind??'login']}</small></span>›
        </button>):<p className="empty">No items. Add one or import an encrypted backup.</p>}</div>
        <div className="bottom-actions"><button onClick={exportFile}>↓ Encrypted backup</button>
          <label className="import-button">↑ Import<input type="file" accept=".json" hidden onChange={e=>void restore(e)}/></label></div>
        <p className="muted">Migration: Bitwarden plaintext JSON only. Review omissions. Delete the plaintext export when safe.</p>
        <label className="secondary import-button">↑ Import Bitwarden JSON
          <input type="file" aria-label="Bitwarden plaintext JSON file" accept=".json" hidden disabled={busy}
            onChange={e=>void importBitwarden(e)}/></label>
      </>:selected?<><button className="back" onClick={()=>setSelected(null)}>← Back</button>
        <h2>{selected.title}</h2><p className="muted">{kindName[selected.kind??'login']}</p>
        {selected.kind==='note'?<p className="note-content">{selected.notes}</p>:<>
          {selected.username&&<p className="detail">Username <strong>{selected.username}</strong></p>}
          {selected.website&&<p className="detail">Website <strong>{selected.website}</strong></p>}
          {selected.kind==='passkey'&&<>
            <p className="notice">Passkey reference only; Firefox/OS authenticators handle actual passkey sign-in.</p>
            {selected.passkey?.rpId&&<p className="detail">Relying-party domain
              <strong>{selected.passkey.rpId}</strong></p>}
          </>}
          {selected.otp&&<><button className="primary" onClick={()=>void showOtp(selected,true)}>Copy {selected.otp.type==='hotp'?'HOTP':'TOTP'}</button>
            {code&&<div className="code">{code}</div>}</>}
          {(!selected.kind||selected.kind==='login')&&<button className="primary"
            disabled={!tab?.url||!matchingHttpsOrigin(selected.website,tab.url)}
            onClick={()=>void fill(selected)}>Fill current HTTPS site</button>}
          {selected.notes&&<p className="note-content">{selected.notes}</p>}
        </>}
        {(selected.customFields??[]).length>0&&
          <button className="secondary" onClick={()=>setRevealCustom(!revealCustom)}>
            {revealCustom?'Conceal secret fields':'Reveal custom fields'}
          </button>}
        {(selected.customFields??[]).map((field,i)=><p className="detail" key={i}>
          {field.name}<strong>{field.concealed&&!revealCustom?'••••••':field.value}</strong></p>)}
        {(selected.tags??[]).length>0&&<p className="muted">Tags: {selected.tags?.join(', ')}</p>}
        <button className="secondary" onClick={()=>editing(selected)}>Edit item</button>
      </>:<form className="editor" onSubmit={e=>void submitEdit(e)}>
        <button type="button" className="back" onClick={()=>setEdit(null)}>← Cancel</button>
        <h2>{items.some(x=>x.id===edit!.id)?'Edit':'New'} {kindName[edit!.kind??'login']}</h2>
        <label>Type<select value={edit!.kind??'login'} onChange={e=>setEdit({...edit!,kind:e.target.value as VaultKind})}>
          {(['login','note','otp','passkey'] as const).map(k=><option value={k} key={k}>{kindName[k]}</option>)}</select></label>
        <label>Title<input required value={edit!.title} maxLength={20000} onChange={e=>setEdit({...edit!,title:e.target.value})}/></label>
        {(edit!.kind??'login')==='login'&&<>
          <label>Username<input autoComplete="off" value={edit!.username} onChange={e=>setEdit({...edit!,username:e.target.value})}/></label>
          <label>Password<input type="password" autoComplete="off" value={edit!.password} onChange={e=>setEdit({...edit!,password:e.target.value})}/></label>
          <button type="button" className="secondary" onClick={()=>setEdit({...edit!,password:generatePassword()})}>Generate password</button>
          <label>Exact HTTPS website<input type="url" placeholder="https://example.org" value={edit!.website}
            onChange={e=>setEdit({...edit!,website:e.target.value})}/></label>
        </>}
        {(edit!.kind==='otp'||edit!.kind==='login')&&
          <label>OTP secret or otpauth URI<input type="password" autoComplete="off" value={otpText}
            onChange={e=>setOtpText(e.target.value)}/></label>}
        {edit!.kind==='passkey'&&<><p className="notice">Metadata only; no passkey registration or private key storage.</p>
          <label>RP domain<input value={edit!.passkey?.rpId??''}
            onChange={e=>setEdit({...edit!,passkey:{rpId:e.target.value,credentialId:'',userHandle:''}})}/></label></>}
        <label>Encrypted notes<textarea rows={4} value={edit!.notes} onChange={e=>setEdit({...edit!,notes:e.target.value})}/></label>
        <label>Tags (comma-separated)
          <input maxLength={3500} value={(edit!.tags??[]).join(', ')}
            onChange={e=>setEdit({...edit!,tags:e.target.value.split(',')
              .map(t=>t.trim().slice(0,120)).filter(Boolean).slice(0,30)})}/>
        </label>
        <label className="check-field">Favorite
          <input type="checkbox" checked={edit!.favorite===true}
            onChange={e=>setEdit({...edit!,favorite:e.target.checked})}/>
        </label>
        <h3 className="field-heading">Custom encrypted fields</h3>
        {(edit!.customFields??[]).map((field,i)=><div className="custom-field" key={i}>
          <label>Field name
            <input maxLength={150} value={field.name}
              onChange={e=>setEdit({...edit!,customFields:(edit!.customFields??[]).map(
                (f,j)=>j===i?{...f,name:e.target.value}:f)})}/>
          </label>
          <label>Value
            <input maxLength={20000} type={field.concealed&&!revealCustom?'password':'text'}
              value={field.value}
              onChange={e=>setEdit({...edit!,customFields:(edit!.customFields??[]).map(
                (f,j)=>j===i?{...f,value:e.target.value}:f)})}/>
          </label>
          <label className="check-field">Conceal value
            <input type="checkbox" checked={field.concealed}
              onChange={e=>setEdit({...edit!,customFields:(edit!.customFields??[]).map(
                (f,j)=>j===i?{...f,concealed:e.target.checked}:f)})}/>
          </label>
          <button type="button" className="secondary"
            onClick={()=>setEdit({...edit!,customFields:(edit!.customFields??[]).filter((_,j)=>j!==i)})}>
            Remove field
          </button>
        </div>)}
        <div className="field-actions">
          <button type="button" className="secondary"
            onClick={()=>setRevealCustom(!revealCustom)}>
            {revealCustom?'Hide custom values':'Reveal custom values'}
          </button>
          <button type="button" className="secondary"
            disabled={(edit!.customFields??[]).length>=30}
            onClick={()=>setEdit({...edit!,customFields:[...(edit!.customFields??[]),
              {name:'',value:'',concealed:true}]})}>
            + Custom field
          </button>
        </div>
        <button className="primary" disabled={busy}>Save encrypted</button>
        {items.some(x=>x.id===edit!.id)&&<button type="button" className="danger"
          onClick={()=>{if(window.confirm('Delete encrypted item?'))void save(items.filter(x=>x.id!==edit!.id));}}>Delete item</button>}
      </form>}
      {error&&<p role="status" className="alert">{error}</p>}
    </main>}
    <footer>No background access · No cloud sync · Not audited</footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Extension/></React.StrictMode>);
