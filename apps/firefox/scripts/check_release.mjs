import assert from 'node:assert/strict';
import {existsSync, lstatSync, readFileSync, readdirSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Static release boundary check only, NOT malware analysis or AMO signing.
 * Intentionally exact: adding new API/host permissions requires code review
 * and an explicit update to this allowlist instead of silent policy drift.
 */
export function validateManifest(manifest) {
  assert.equal(manifest?.manifest_version, 3, 'Expected Manifest V3');
  assert.deepEqual(Object.keys(manifest).sort(),
    ['manifest_version','name','version','description',
     'browser_specific_settings','permissions','action',
     'content_security_policy'].sort(),
    'Unreviewed Firefox manifest top-level capability');
  assert.equal(manifest?.name, 'GoreeCloud Vault');
  assert.equal(manifest?.action?.default_popup, 'popup.html');
  assert.equal(manifest?.browser_specific_settings?.gecko?.id, 'vault@goreecloud.com');
  assert.equal(manifest?.browser_specific_settings?.gecko?.strict_min_version, '142.0');
  assert.deepEqual(
    [...(manifest?.permissions ?? [])].sort(),
    ['activeTab','scripting','storage'].sort(),
    'Firefox permissions require a specific source and policy review',
  );
  assert.deepEqual(manifest?.browser_specific_settings?.gecko?.
    data_collection_permissions, {required:['none']});
  assert.equal(manifest?.content_security_policy?.extension_pages,
    "script-src 'self'; object-src 'none'",
    'Unexpected extension CSP');
  for (const permissionKey of [
    'host_permissions','optional_host_permissions','optional_permissions',
    'background','content_scripts','externally_connectable',
    'web_accessible_resources','declarative_net_request',
    'declarative_net_request_feedback','commands','devtools_page'
  ]) {
    assert.equal(Object.hasOwn(manifest, permissionKey),false,
      'Unexpected extension permission/surface: ' + permissionKey);
  }
}

export function validatePopup(html) {
  assert.equal(typeof html,'string');
  const scripts=[...html.matchAll(/<script\b[^>]*>/gi)].map(x=>x[0]);
  assert.equal(scripts.length,1,'Popup must load only one bundled script');
  assert.match(scripts[0],/\bsrc="\/assets\/[a-zA-Z0-9_.-]+\.js"/,
    'Popup script must be bundled locally');
  assert.doesNotMatch(scripts[0],/\b(?:onload|onerror)\s*=/i,
    'No inline event handlers');
  const css=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)];
  assert.equal(css.length,1,'Popup must load one local bundled stylesheet');
  assert.match(css[0][0],/\bhref="\/assets\/[a-zA-Z0-9_.-]+\.css"/);
  assert.doesNotMatch(html, /\bon[a-z]+\s*=/i,'No inline event handlers anywhere');
  assert.doesNotMatch(html, /<iframe\b|<object\b|<embed\b|<base\b/i,
    'No remote frames, object embedding or base URL rewrite');
}

export function validateBuild(dir) {
  const all=[];
  function walk(path,relative='') {
    for(const entry of readdirSync(path,{withFileTypes:true})) {
      const name=relative ? relative+'/'+entry.name : entry.name;
      const absolute=join(path,entry.name);
      assert.equal(lstatSync(absolute).isSymbolicLink(),false,
        'Symlinks are not permitted in the unsigned package');
      if(entry.isDirectory()) {
        assert.equal(name,'assets','Unexpected packaged directory');
        walk(absolute,name);
      } else {
        assert.equal(entry.isFile(),true,'Unexpected packaged entry');
        assert.match(name,/^(manifest\.json|popup\.html|assets\/[a-zA-Z0-9_.-]+\.(js|css))$/,
          'Unexpected packaged file');
        assert.ok(lstatSync(absolute).size <= 1_500_000,
          'Oversized packaged asset');
        all.push(name);
      }
    }
  }
  walk(dir);
  assert.equal(all.filter(x=>x==='manifest.json').length,1);
  assert.equal(all.filter(x=>x==='popup.html').length,1);
  assert.equal(all.filter(x=>/^assets\/.*\.js$/.test(x)).length,1);
  assert.equal(all.filter(x=>/^assets\/.*\.css$/.test(x)).length,1);
  const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8'));
  validateManifest(manifest);
  const packageJson=JSON.parse(readFileSync(
    fileURLToPath(new URL('../package.json',import.meta.url)),'utf8'));
  assert.equal(manifest.version,packageJson.version,
    'Manifest and npm package versions must match');
  validatePopup(readFileSync(join(dir,'popup.html'),'utf8'));
  return all.length;
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const dir=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
  assert.ok(existsSync(dir),'Build Firefox extension before validating it');
  try{
    const count=validateBuild(dir);
    process.stdout.write('Unsigned Firefox package boundary verified: '+
      count+' local assets; no host permissions or background execution.\n');
  }catch{
    process.stderr.write('Firefox extension security boundary check failed.\n');
    process.exitCode=1;
  }
}
