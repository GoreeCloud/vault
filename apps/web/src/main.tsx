import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { encryptEntries, generatePassword, initialize, parseEnvelope, randomId, STORAGE_KEY, unlock,
  type Entry, type VaultEnvelope, type VaultKind, type CustomField } from './crypto';
import { generateOtp, parseOtp } from './otp';
import { bitwardenImportWarning, parseBitwardenPlaintextJson } from './import_bitwarden';
import { parseProtonPassPlaintextJson, protonImportWarning } from './import_proton';
import './style.css';

const blank = (kind: VaultKind): Entry =>
  ({ id: randomId(), title: '', username: '', password: '', website: '', notes: '', kind,
     customFields: [], tags: [], favorite: false });
const kindLabel: Record<VaultKind,string> = { login:'Logins', note:'Secure notes', otp:'Authenticators', passkey:'Passkey references' };
const kindIcon: Record<VaultKind,string> = { login:'◈', note:'▤', otp:'◷', passkey:'✧' };
const itemKind = (e: Entry): VaultKind => e.kind ?? 'login';

function App() {
  const [envelope, setEnvelope] = useState<VaultEnvelope | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return parseEnvelope(raw); } catch { return null; }
  });
  const [corruptedAtLoad] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try { parseEnvelope(raw); return false; } catch { return true; }
  });
  const key = useRef<CryptoKey | null>(null);
  // Incremented on every lock so in-flight KDF/encryption promises cannot
  // reopen the vault after the document was hidden or explicitly locked.
  const lockEpoch = useRef(0);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [master, setMaster] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | VaultKind | 'favorite'>('all');
  const [edit, setEdit] = useState<Entry | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpCodes, setOtpCodes] = useState<Record<string,string>>({});
  const [nowSeconds, setNowSeconds] = useState(Math.floor(Date.now()/1000));

  const lock = () => {
    lockEpoch.current++;
    key.current = null; setEntries(null); setMaster(''); setEdit(null);
    setShowSecret(false); setOtpCodes({});
  };
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') lock(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);
  useEffect(() => {
    if (entries === null) return;
    // Deliberate auto-lock after 5 minutes without a local user gesture.
    // Keep this client-side; do not record activity or vault contents remotely.
    const idleMs = 5 * 60 * 1000;
    let timer = window.setTimeout(lock, idleMs);
    const onActivity = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, idleMs);
    };
    document.addEventListener('pointerdown', onActivity, true);
    document.addEventListener('keydown', onActivity, true);
    document.addEventListener('input', onActivity, true);
    window.addEventListener('focus', onActivity);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onActivity, true);
      document.removeEventListener('keydown', onActivity, true);
      document.removeEventListener('input', onActivity, true);
      window.removeEventListener('focus', onActivity);
    };
  }, [entries]);

  useEffect(() => {
    if (!entries) return;
    let cancelled = false;
    const refresh = async () => {
      const codes: Record<string,string> = {};
      const now = Date.now();
      for (const entry of entries) {
        if (entry.otp?.type === 'totp') {
          try { codes[entry.id] = await generateOtp(entry.otp, now); }
          catch { codes[entry.id] = 'Invalid OTP'; }
        }
      }
      if (!cancelled && key.current !== null && document.visibilityState === 'visible') {
        setOtpCodes(codes); setNowSeconds(Math.floor(now / 1000));
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [entries]);

  async function submitMaster(event: React.FormEvent) {
    event.preventDefault();
    if (corruptedAtLoad || busy) return;
    const epoch = lockEpoch.current;
    setBusy(true); setNotice('');
    try {
      if (envelope) {
        const result = await unlock(master, envelope);
        if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
        key.current = result.key; setEntries(result.entries);
      } else {
        const result = await initialize(master);
        if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.envelope));
        key.current = result.key; setEnvelope(result.envelope); setEntries([]);
      }
      setMaster('');
    } catch {
      if (epoch === lockEpoch.current) setNotice('Unable to unlock. Check your password and vault integrity.');
    } finally { setBusy(false); }
  }

  async function persist(next: Entry[]): Promise<boolean> {
    if (!key.current || !envelope || busy) return false;
    const epoch = lockEpoch.current;
    setBusy(true); setNotice('');
    try {
      const sealed = await encryptEntries(next, key.current, envelope.kdf.salt);
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sealed));
      setEnvelope(sealed); setEntries(next); setEdit(null);
      return true;
    } catch {
      if (epoch === lockEpoch.current) setNotice('Save failed. Your existing encrypted vault was retained.');
      return false;
    } finally { setBusy(false); }
  }

  function downloadBackup() {
    if (!envelope) return;
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = 'goreecloud-vault-encrypted.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5_000_000) { setNotice('Backup is too large.'); return; }
    const password = window.prompt('Enter the MASTER PASSWORD of this encrypted backup:');
    if (password == null) return;
    const epoch = lockEpoch.current;
    setBusy(true); setNotice('');
    try {
      const parsed = parseEnvelope(await file.text());
      await unlock(password, parsed);
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
      if (!window.confirm('Replace this device\'s encrypted vault? Export a backup first. This does not merge items.')) return;
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      lock();
      setEnvelope(parsed);
      setNotice('Encrypted backup restored. Unlock it with its master password.');
    } catch {
      if (epoch === lockEpoch.current) setNotice('Restore failed. File is invalid or the backup password is wrong. Existing data is unchanged.');
    } finally { setBusy(false); }
  }

  async function importBitwarden(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || entries === null || !key.current || busy) return;
    if (file.size === 0 || file.size > 5_000_000) {
      setNotice('Bitwarden plaintext JSON must be 1 byte to 5 MB.');
      return;
    }
    const epoch = lockEpoch.current;
    setBusy(true); setNotice('');
    try {
      // In-memory parse. No external migration service, network or plaintext
      // downloads. The user-supplied source file stays on the user's disk.
      const text = await file.text();
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
      const preview = parseBitwardenPlaintextJson(text, randomId);
      if (entries.length + preview.entries.length > 20_000) {
        throw Error('Vault would exceed item limit');
      }
      if (!window.confirm(bitwardenImportWarning(preview))) return;
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
      // persist encrypts and commits atomically. No plaintext export data is
      // saved in localStorage, and existing items are retained on rejection.
      const added = await persist([...entries, ...preview.entries]);
      if (added && epoch === lockEpoch.current) {
        setNotice('Bitwarden login/note items encrypted and added locally. Review imported records.');
      }
    } catch {
      if (epoch === lockEpoch.current) {
        setNotice('Bitwarden import rejected. Unsupported format or invalid data; existing vault retained.');
      }
    } finally { setBusy(false); }
  }

  async function importProton(event: React.ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];
    event.target.value='';
    if (!file || entries===null || !key.current || busy) return;
    if (file.size===0 || file.size>5_000_000) {
      setNotice('Select an extracted Proton Pass plaintext data.json (max 5 MB), not a ZIP or PGP file.');
      return;
    }
    const epoch=lockEpoch.current;
    setBusy(true);setNotice('');
    try {
      const source=await file.text();
      if (epoch!==lockEpoch.current || document.visibilityState!=='visible') return;
      const preview=parseProtonPassPlaintextJson(source,randomId);
      if(entries.length+preview.entries.length>20_000)throw Error('Too many entries');
      if(!window.confirm(protonImportWarning(preview)))return;
      if(epoch!==lockEpoch.current || document.visibilityState!=='visible')return;
      const written=await persist([...entries,...preview.entries]);
      if(written && epoch===lockEpoch.current)
        setNotice('Proton Pass login/note items encrypted locally. Review imported records.');
    }catch{
      if(epoch===lockEpoch.current)
        setNotice('Proton Pass import rejected or save failed. Inspect the encrypted vault before retrying.');
    }finally{setBusy(false);}
  }

  async function saveEditor(event: React.FormEvent) {
    event.preventDefault();
    if (!edit || !entries) return;
    let next: Entry = {...edit, title: edit.title.trim()};
    if (!next.title) { setNotice('Title is required.'); return; }
    if (next.kind === 'otp' || otpInput.trim()) {
      try {
        next = {...next, otp: edit.otp && edit.otp.secret === otpInput.trim() ? edit.otp : parseOtp(otpInput.trim())};
      } catch { setNotice('Invalid OTP secret or otpauth URI.'); return; }
    } else {
      // Removing the authenticator secret from an existing login is intentional.
      delete next.otp;
    }
    const exists = entries.some(item => item.id === next.id);
    await persist(exists ? entries.map(item => item.id === next.id ? next : item) : [...entries, next]);
  }

  async function copyOtp(entry: Entry) {
    if (!entry.otp || !entries || !key.current) return;
    const epoch = lockEpoch.current;
    try {
      const code = await generateOtp(entry.otp);
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
      if (entry.otp.type === 'hotp') {
        const updated = entries.map(x => x.id === entry.id ?
          {...x, otp: {...entry.otp!, counter: entry.otp!.counter + 1}} : x);
        if (!await persist(updated)) return;
      }
      if (epoch !== lockEpoch.current || document.visibilityState !== 'visible') return;
      await navigator.clipboard.writeText(code);
      if (epoch === lockEpoch.current) {
        setNotice(entry.otp.type === 'hotp' ? 'HOTP copied; counter advanced in encrypted storage.' : 'Current OTP copied. Clipboard contents may persist.');
      }
    } catch { setNotice('Could not copy the OTP. Check clipboard permissions.'); }
  }

  const visible = (entries ?? []).filter(item => {
    const category = itemKind(item);
    return (filter === 'all' || (filter === 'favorite' ? item.favorite === true : category === filter)) &&
      [item.title, item.username, item.website, ...(item.tags??[])].some(v =>
        v.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  });
  const startEdit = (value: Entry) => {
    setEdit({...value, customFields: [...(value.customFields??[])], tags:[...(value.tags??[])]});
    setOtpInput(value.otp?.secret ?? ''); setShowSecret(false); setNotice('');
  };
  const openNew = (kind: VaultKind) => startEdit(blank(kind));

  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-icon" aria-hidden="true">◇</div>
        <div><strong>GoreeCloud Vault</strong><small>PRIVATE BY DESIGN · AUTO-LOCK 5 MIN</small></div></div>
      <span className="status"><span className="status-dot" />Local-only encryption</span>
      {entries !== null && <button className="quiet" onClick={lock}>Lock vault</button>}
    </header>
    {corruptedAtLoad ? <main className="onboarding"><div className="intro">
      <span className="eyebrow">RECOVERY REQUIRED</span><h1>Encrypted data needs attention.</h1>
      <p>Stored vault data is damaged or unsupported. It has not been overwritten.
        Export and preserve the damaged storage before attempting recovery.</p>
    </div></main> : entries === null ? <main className="onboarding">
      <div className="intro"><span className="eyebrow">YOUR SECRETS. YOUR DEVICE.</span>
        <h1>Security that feels <em>effortless.</em></h1>
        <p>Passwords, secure notes and authenticators encrypted on your device.
          No account or cloud connection required.</p>
        <div className="trust"><span>◉ AES-256-GCM</span><span>◉ Offline first</span><span>◉ Open source</span></div>
      </div>
      <form className="surface unlock" onSubmit={submitMaster}>
        <div className="icon-tile">⌑</div><h2>{envelope ? 'Unlock your vault' : 'Create an encrypted vault'}</h2>
        <p>{envelope ? 'Enter the master password you set on this device.' :
          'Choose a unique master password of at least 12 characters. It cannot be recovered.'}</p>
        <label htmlFor="master">Master password</label>
        <input id="master" type="password" value={master} minLength={envelope ? 1 : 12}
          maxLength={1024} autoComplete={envelope ? 'current-password' : 'new-password'}
          onChange={e => setMaster(e.target.value)} required autoFocus />
        <button className="primary" disabled={busy}>{busy ? 'Working…' : envelope ? 'Unlock securely' : 'Create vault'}</button>
        <span className="field-note">No account recovery or synced storage is configured.</span>
        {notice && <p className="error" role="alert">{notice}</p>}
        <label className="quiet import-label">Import encrypted backup
          <input type="file" accept=".json,application/json" disabled={busy}
            onChange={e => void importBackup(e)} hidden /></label>
      </form>
    </main> : <main className="dashboard">
      <aside className="sidebar surface">
        <div className="side-heading">WORKSPACE</div>
        <button className={'sidebar-link '+(filter==='all'?'active':'')} onClick={()=>setFilter('all')}>
          All items <b>{entries.length}</b></button>
        {(['login','note','otp','passkey'] as const).map(kind =>
          <button key={kind} className={'sidebar-link '+(filter===kind?'active':'')}
            onClick={()=>setFilter(kind)}>{kindIcon[kind]} &nbsp; {kindLabel[kind]}
            <b>{entries.filter(x=>itemKind(x)===kind).length}</b></button>)}
        <button className={'sidebar-link '+(filter==='favorite'?'active':'')}
          onClick={()=>setFilter('favorite')}>☆ &nbsp; Favorites</button>
        <div className="side-heading second">ENCRYPTED BACKUPS</div>
        <p className="sidebar-note">Keep an encrypted backup outside browser storage. The master password cannot be recovered.</p>
        <button className="quiet backup" onClick={downloadBackup}>↓ Export encrypted backup</button>
        <label className="quiet backup import-label">↑ Restore encrypted backup
          <input type="file" accept=".json,application/json" onChange={e=>void importBackup(e)} hidden /></label>
        <div className="side-heading second">IMPORT FROM OTHER MANAGERS</div>
        <p className="sidebar-note">Bitwarden plaintext JSON, or Proton Pass data.json extracted from an unencrypted ZIP. Sources remain on disk; review omissions and protect or securely delete plaintext when safe.</p>
        <label className="quiet backup import-label">↑ Import Bitwarden plaintext JSON
          <input type="file" aria-label="Bitwarden plaintext JSON file" accept=".json,application/json"
            disabled={busy} onChange={e=>void importBitwarden(e)} hidden /></label>
        <label className="quiet backup import-label">↑ Import Proton Pass data.json
          <input type="file" aria-label="Proton Pass plaintext data.json file" accept=".json,application/json"
            disabled={busy} onChange={e=>void importProton(e)} hidden /></label>
      </aside>
      <section className="workspace">
        <div className="workspace-head"><div><span className="eyebrow">YOUR PRIVATE LIBRARY</span>
          <h1>{filter==='all'?'All items':filter==='favorite'?'Favorites':kindLabel[filter]}
            <span className="count">{visible.length}</span></h1>
          <p>Local only · encrypted before storage</p></div>
          <button className="primary" onClick={()=>openNew(filter==='all'||filter==='favorite'?'login':filter)}>+ New item</button>
        </div>
        <div className="quick-create">
          <button onClick={()=>openNew('login')}>+ Login</button><button onClick={()=>openNew('note')}>+ Secure note</button>
          <button onClick={()=>openNew('otp')}>+ Authenticator</button>
          <button onClick={()=>openNew('passkey')}>+ Passkey reference</button>
        </div>
        <input aria-label="Search encrypted items" className="search"
          placeholder="Search titles, usernames and tags" value={query} onChange={e=>setQuery(e.target.value)} />
        <div className="item-list">{visible.length===0 ?
          <div className="empty"><div className="empty-icon">⌘</div><h3>{query?'No matching entries':'Your vault starts here'}</h3>
            <p>{query?'Try a different search.':'Create a login, secure note or authenticator to get started.'}</p></div> :
          visible.map(item=><div className="vault-item" key={item.id}>
            <button className="item" onClick={()=>startEdit(item)}>
              <span className="item-glyph">{kindIcon[itemKind(item)]}</span>
              <span className="item-copy"><strong>{item.title || 'Untitled item'}</strong>
                <small>{kindLabel[itemKind(item)]} · {item.username || item.website || (item.tags??[]).join(', ') || 'Encrypted'}</small></span>
              <span className="item-chevron">›</span></button>
            {item.otp && <button className="otp-pill" onClick={()=>void copyOtp(item)}
              title={item.otp.type==='hotp'?'Copy and advance HOTP counter':'Copy time-based code'}>
              {item.otp.type==='totp' ? (otpCodes[item.id] ?? '••••••') : 'Use HOTP'}
              <small>{item.otp.type==='totp'?(item.otp.period - nowSeconds % item.otp.period)+'s':'counter +1'}</small></button>}
          </div>)}</div>
        {notice && <p className="status-note" role="status">{notice}</p>}
      </section>
    </main>}
    {edit && entries && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null);}}>
      <form className="surface editor" onSubmit={e=>void saveEditor(e)}>
        <div className="editor-head"><div><span className="eyebrow">ENCRYPTED ITEM</span>
          <h2>{entries.some(x=>x.id===edit.id)?'Edit':'New'} {kindLabel[itemKind(edit)].toLowerCase()}</h2></div>
          <button className="quiet" type="button" onClick={()=>setEdit(null)}>Close</button></div>
        <label className="edit-field"><span>Item type</span>
          <select value={itemKind(edit)} onChange={e=>setEdit({...edit,kind:e.target.value as VaultKind})}>
            {(['login','note','otp','passkey'] as const).map(kind=><option key={kind} value={kind}>{kindLabel[kind]}</option>)}
          </select></label>
        <label className="edit-field"><span>Title</span><input required maxLength={20000}
          value={edit.title} onChange={e=>setEdit({...edit,title:e.target.value})} /></label>
        {itemKind(edit)==='login' && <>
          <label className="edit-field"><span>Username / email</span><input maxLength={20000} autoComplete="off"
            value={edit.username} onChange={e=>setEdit({...edit,username:e.target.value})}/></label>
          <label className="edit-field"><span>Password</span><div className="input-row">
            <input maxLength={20000} autoComplete="off" type={showSecret?'text':'password'}
              value={edit.password} onChange={e=>setEdit({...edit,password:e.target.value})}/>
            <button type="button" className="field-button" onClick={()=>setShowSecret(!showSecret)}>{showSecret?'Hide':'Reveal'}</button>
            <button type="button" className="field-button" onClick={()=>setEdit({...edit,password:generatePassword()})}>Generate</button>
          </div></label>
          <label className="edit-field"><span>Website</span><input maxLength={20000} type="url"
            placeholder="https://example.org" value={edit.website} onChange={e=>setEdit({...edit,website:e.target.value})}/></label>
        </>}
        {(itemKind(edit)==='otp'||itemKind(edit)==='login') && <>
          <label className="edit-field"><span>Authenticator (Base32 secret or otpauth:// URI)</span>
            <input autoComplete="off" type={showSecret?'text':'password'}
              placeholder="Optional for logins" value={otpInput} maxLength={2500}
              onChange={e=>setOtpInput(e.target.value)}/></label>
          <p className="field-note">Supports RFC 6238 TOTP (SHA-1/256/512) and HOTP. Secrets are encrypted in your vault.</p>
        </>}
        {itemKind(edit)==='passkey' && <>
          <p className="field-note">This records a passkey reference only, not an authenticator or portable private key.
            Your browser or device manages actual passkey sign-in.</p>
          <label className="edit-field"><span>Relying-party domain</span><input maxLength={253}
            placeholder="example.org" value={edit.passkey?.rpId??''}
            onChange={e=>setEdit({...edit,passkey:{rpId:e.target.value,credentialId:edit.passkey?.credentialId??'',userHandle:edit.passkey?.userHandle??''}})}/></label>
          <label className="edit-field"><span>Credential ID (optional)</span><input maxLength={4096}
            value={edit.passkey?.credentialId??''}
            onChange={e=>setEdit({...edit,passkey:{rpId:edit.passkey?.rpId??'',credentialId:e.target.value,userHandle:edit.passkey?.userHandle??''}})}/></label>
        </>}
        <label className="edit-field"><span>{itemKind(edit)==='note'?'Secure note':'Notes'}</span>
          <textarea value={edit.notes} rows={itemKind(edit)==='note'?8:3} maxLength={20000}
            onChange={e=>setEdit({...edit,notes:e.target.value})}/></label>
        <label className="edit-field"><span>Tags (comma-separated)</span><input maxLength={3500}
          value={(edit.tags??[]).join(', ')}
          onChange={e=>setEdit({...edit,tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,30)})}/></label>
        <label className="check-field"><input type="checkbox" checked={edit.favorite??false}
          onChange={e=>setEdit({...edit,favorite:e.target.checked})}/> Favorite</label>
        <div className="edit-field"><span>Custom encrypted fields</span>
          {(edit.customFields??[]).map((field,index)=><div className="custom-row" key={index}>
            <input aria-label={'Field '+(index+1)+' name'} placeholder="Field name" value={field.name}
              maxLength={150} onChange={e=>setEdit({...edit,customFields:(edit.customFields??[]).map((f,i)=>i===index?{...f,name:e.target.value}:f)})}/>
            <input aria-label={'Field '+(index+1)+' value'} placeholder="Value"
              type={field.concealed&&!showSecret?'password':'text'} maxLength={20000} value={field.value}
              onChange={e=>setEdit({...edit,customFields:(edit.customFields??[]).map((f,i)=>i===index?{...f,value:e.target.value}:f)})}/>
            <button type="button" className="field-button" title="Remove custom field"
              onClick={()=>setEdit({...edit,customFields:edit.customFields?.filter((_,i)=>i!==index)})}>×</button>
          </div>)}
          <button type="button" className="quiet add-field" disabled={(edit.customFields??[]).length>=30}
            onClick={()=>setEdit({...edit,customFields:[...(edit.customFields??[]),{name:'',value:'',concealed:true} as CustomField]})}>+ Add custom field</button></div>
        {notice && <p className="error" role="alert">{notice}</p>}
        <div className="editor-actions">{entries.some(x=>x.id===edit.id) && <button type="button"
          className="danger" disabled={busy}
          onClick={()=>{if(window.confirm('Permanently delete this encrypted item?'))void persist(entries.filter(x=>x.id!==edit.id));}}>Delete</button>}
          <button type="submit" className="primary" disabled={busy}>{busy?'Saving…':'Save encrypted'}</button></div>
      </form></div>}
    <footer><span>GoreeCloud UI · development preview</span><span>No cloud sync · No passkey authenticator · Not audited</span></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
