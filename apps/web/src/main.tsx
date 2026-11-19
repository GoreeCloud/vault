import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { encryptEntries, generatePassword, initialize, parseEnvelope, randomId, STORAGE_KEY, unlock, type Entry, type VaultEnvelope } from './crypto';
import './style.css';

const BLANK: Entry = { id: '', title: '', username: '', password: '', website: '', notes: '' };

function App() {
  const [envelope, setEnvelope] = useState<VaultEnvelope | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return parseEnvelope(raw); } catch { return null; }
  });
  // A malformed existing vault must never be silently replaced by a new one.
  const [corruptedAtLoad] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try { parseEnvelope(raw); return false; } catch { return true; }
  });
  const key = useRef<CryptoKey | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [master, setMaster] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [edit, setEdit] = useState<Entry | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const lock = () => { key.current = null; setEntries(null); setMaster(''); setEdit(null); setShowSecret(false); };
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') lock(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);
  async function submitMaster(event: React.FormEvent) {
    event.preventDefault(); if (corruptedAtLoad) return; setBusy(true); setNotice('');
    try {
      if (envelope) {
        const result = await unlock(master, envelope);
        key.current = result.key; setEntries(result.entries);
      } else {
        const result = await initialize(master);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.envelope));
        key.current = result.key; setEnvelope(result.envelope); setEntries([]);
      }
      setMaster('');
    } catch { setNotice('Could not open vault. Check your password, browser storage, and vault integrity.'); }
    finally { setBusy(false); }
  }
  async function persist(next: Entry[]) {
    if (!key.current || !envelope) return;
    setBusy(true); setNotice('');
    try {
      const sealed = await encryptEntries(next, key.current, envelope.kdf.salt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sealed));
      setEnvelope(sealed); setEntries(next); setEdit(null);
    } catch { setNotice('Save failed. Existing encrypted data was retained.'); }
    finally { setBusy(false); }
  }
  function downloadBackup() {
    if (!envelope) return;
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = href; a.download = 'goreecloud-vault-encrypted.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  const visible = entries?.filter(item =>
    [item.title, item.username, item.website].some(v => v.toLocaleLowerCase().includes(query.toLocaleLowerCase()))) ?? [];
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-icon" aria-hidden="true">◇</div><div><strong>GoreeCloud Vault</strong><small>PRIVATE BY DESIGN · OFFLINE PREVIEW</small></div></div>
      <span className="status"><span className="status-dot" />No server connection</span>
      {entries && <button className="quiet" onClick={lock}>Lock vault</button>}
    </header>
    {corruptedAtLoad ? <main className="onboarding"><div className="intro">
      <span className="eyebrow">RECOVERY REQUIRED</span><h1>Encrypted data needs attention.</h1>
      <p>Stored vault data is damaged or uses an unsupported format. It has not been overwritten. Restore a known-good backup using a future recovery tool.</p>
    </div></main> : entries === null ? <main className="onboarding">
      <div className="intro"><span className="eyebrow">YOUR SECRETS. YOUR DEVICE.</span><h1>Security that feels <em>effortless.</em></h1>
        <p>Your passwords stay encrypted on this device. No accounts, telemetry or synchronization in this development preview.</p>
        <div className="trust"><span>◉ AES-256-GCM</span><span>◉ Offline first</span><span>◉ Open source</span></div>
      </div>
      <form className="surface unlock" onSubmit={submitMaster}>
        <div className="icon-tile">⌑</div>
        <h2>{envelope ? 'Unlock your vault' : 'Create an encrypted vault'}</h2>
        <p>{envelope ? 'Enter the master password you set on this device.' : 'Choose a unique master password of at least 12 characters. It cannot be recovered.'}</p>
        <label htmlFor="master">Master password</label>
        <input id="master" type="password" value={master} minLength={envelope ? 1 : 12} maxLength={1024} autoComplete={envelope ? 'current-password' : 'new-password'} onChange={e => setMaster(e.target.value)} required autoFocus />
        <button className="primary" disabled={busy}>{busy ? 'Working…' : envelope ? 'Unlock securely' : 'Create vault'}</button>
        <span className="field-note">Encryption runs in your browser. We cannot restore a forgotten password.</span>
        {notice && <p className="error" role="alert">{notice}</p>}
      </form>
    </main> : <main className="dashboard">
      <aside className="sidebar surface"><div className="side-heading">WORKSPACE</div><div className="nav-selected">▣ &nbsp; All items <b>{entries.length}</b></div><div className="side-heading second">SECURITY</div><div className="sidebar-note">Locked automatically when this tab is hidden. Export an encrypted backup regularly.</div><button className="quiet backup" onClick={downloadBackup}>↓ &nbsp; Export encrypted backup</button></aside>
      <section className="workspace"><div className="workspace-head"><div><span className="eyebrow">ENCRYPTED LIBRARY</span><h1>All items <span className="count">{entries.length}</span></h1><p>Your private credentials, available offline.</p></div><button className="primary" onClick={() => { setEdit({ ...BLANK, id: randomId() }); setShowSecret(false); }}>+ &nbsp; New login</button></div>
        <input aria-label="Search encrypted items" className="search" placeholder="Search by title, username or website" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="item-list">{visible.length === 0 ? <div className="empty"><div className="empty-icon">⌘</div><h3>{query ? 'No matching entries' : 'Your vault starts here'}</h3><p>{query ? 'Try a different search.' : 'Add your first login and it will be encrypted before storage.'}</p></div> :
        visible.map(item => <button className="item" key={item.id} onClick={() => { setEdit({ ...item }); setShowSecret(false); }}><span className="item-glyph">{item.title.slice(0,1).toUpperCase() || '•'}</span><span className="item-copy"><strong>{item.title || 'Untitled login'}</strong><small>{item.username || item.website || 'No username'}</small></span><span className="item-chevron">›</span></button>)}</div>
        {notice && <p className="error" role="alert">{notice}</p>}
      </section>
    </main>}
    {edit && entries && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setEdit(null); }}><form className="surface editor" onSubmit={e => { e.preventDefault(); void persist(entries.some(x=>x.id===edit.id) ? entries.map(x=>x.id===edit.id?edit:x) : [...entries,edit]); }}>
      <div className="editor-head"><div><span className="eyebrow">SECURE ITEM</span><h2>{entries.some(x=>x.id===edit.id) ? 'Edit login' : 'New login'}</h2></div><button className="quiet" type="button" onClick={() => setEdit(null)}>Close</button></div>
      {(['title','username','password','website','notes'] as const).map(field => <label className="edit-field" key={field}><span>{field[0].toUpperCase()+field.slice(1)}</span><div className="input-row">{field==='notes' ? <textarea value={edit[field]} maxLength={20000} onChange={e=>setEdit({...edit,[field]:e.target.value})}/> : <input type={field === 'password' && !showSecret ? 'password' : 'text'} value={edit[field]} maxLength={20000} required={field==='title'} onChange={e=>setEdit({...edit,[field]:e.target.value})} autoComplete="off" />}{field === 'password' && <><button type="button" className="field-button" onClick={()=>setShowSecret(!showSecret)}>{showSecret?'Hide':'Reveal'}</button><button type="button" className="field-button" onClick={()=>setEdit({...edit,password:generatePassword()})}>Generate</button></>}</div></label>)}
      <div className="editor-actions">{entries.some(x=>x.id===edit.id) && <button type="button" className="danger" disabled={busy} onClick={()=>{ if(window.confirm('Permanently delete this login?')) void persist(entries.filter(x=>x.id!==edit.id)); }}>Delete</button>}<button className="primary" disabled={busy}>{busy?'Saving…':'Save encrypted'}</button></div>
    </form></div>}
    <footer><span>GoreeCloud UI · development preview</span><span>No cloud sync · No autofill · Not security audited</span></footer>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
