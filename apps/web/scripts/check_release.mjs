import assert from 'node:assert/strict';
import {existsSync,lstatSync,readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Fail-closed release artifact allowlist, not an independent app audit.
 * The production web UI has no sync, external provider or telemetry API.
 * A future reviewed API will require an explicit CSP and test policy change.
 */
export const expectedCsp =
  "default-src 'none'; script-src 'self'; style-src 'self'; "+
  "img-src 'self' data:; font-src 'self'; connect-src 'none'; "+
  "worker-src 'none'; frame-src 'none'; object-src 'none'; "+
  "base-uri 'none'; form-action 'none'";

export function verifyIndex(html) {
  assert.equal(typeof html,'string');
  assert.doesNotMatch(html,/__VAULT_CSP__/,'CSP build template not processed');
  const csp=html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i);
  assert.ok(csp,'Built app must include explicit CSP');
  assert.equal(csp[1],expectedCsp,'Unexpected or weakened production CSP');
  assert.match(html,/<meta\s+name="referrer"\s+content="no-referrer"\s*\/?>/i);
  assert.equal([...html.matchAll(/http-equiv=/gi)].length,1,
    'Unexpected redirect or other HTTP-equivalent tag');

  const scripts=[...html.matchAll(/<script\b[^>]*>/gi)].map(x=>x[0]);
  assert.equal(scripts.length,1,'Expected one local module entrypoint');
  assert.match(scripts[0],/\bsrc="\/assets\/index-[A-Za-z0-9_-]+\.js"/);
  assert.match(scripts[0],/\btype="module"/);
  assert.equal([...html.matchAll(/<link\b/gi)].length,1,
    'Unexpected resource hint or stylesheet');
  assert.equal([...html.matchAll(/<link\s+rel="stylesheet"\s+[^>]*>/gi)].length,1,
    'Expected one local stylesheet');
  assert.match(html,/\bhref="\/assets\/index-[A-Za-z0-9_-]+\.css"/);
  assert.doesNotMatch(html,/\bon[a-z]+\s*=/i,'No inline event handlers');
  assert.doesNotMatch(html,/<iframe\b|<object\b|<embed\b|<base\b|<form\b/gi,
    'No uncontrolled HTML embed or form submission');
  assert.doesNotMatch(html,/<script\b[^>]*\bsrc="https?:/i,'Remote scripts forbidden');
}

export function verifyDist(dir) {
  const seen=[];
  function walk(path,relative='') {
    for(const entry of readdirSync(path,{withFileTypes:true})) {
      const name=relative ? relative+'/'+entry.name : entry.name;
      const absolute=join(path,entry.name);
      assert.equal(lstatSync(absolute).isSymbolicLink(),false,
        'Release assets cannot include symlinks');
      if(entry.isDirectory()){
        assert.equal(name,'assets','Unreviewed production directory');
        walk(absolute,name);
      }else{
        assert.equal(entry.isFile(),true,'Unexpected packaged entry type');
        assert.match(name,/^(index\.html|assets\/index-[A-Za-z0-9_-]+\.(js|css))$/,
          'Unreviewed release file including sourcemaps');
        assert.ok(lstatSync(absolute).size<=1_500_000,'Oversized release asset');
        seen.push(name);
      }
    }
  }
  walk(dir);
  assert.equal(seen.length,3,'Unexpected bundle contents');
  assert.equal(seen.filter(x=>x==='index.html').length,1);
  assert.equal(seen.filter(x=>/^assets\/index-.*\.js$/.test(x)).length,1);
  assert.equal(seen.filter(x=>/^assets\/index-.*\.css$/.test(x)).length,1);
  const html=readFileSync(join(dir,'index.html'),'utf8');
  verifyIndex(html);
  const js=html.match(/src="\/(assets\/index-[A-Za-z0-9_-]+\.js)"/)?.[1];
  const css=html.match(/href="\/(assets\/index-[A-Za-z0-9_-]+\.css)"/)?.[1];
  assert.ok(js && seen.includes(js),'Entrypoint must exist in the bundle');
  assert.ok(css && seen.includes(css),'Stylesheet must exist in the bundle');
  return seen.length;
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const folder=fileURLToPath(new URL('../dist/',import.meta.url));
  try{
    assert.ok(existsSync(folder),'Build the production bundle first');
    process.stdout.write('Offline web release gate passed: '+
      verifyDist(folder)+' local files, no production connections or workers.\n');
  }catch{
    process.stderr.write('Offline web release boundary check failed.\n');
    process.exitCode=1;
  }
}
