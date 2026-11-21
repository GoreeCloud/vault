import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateManifest,validatePopup,validateBuild} from './check_release.mjs';

const source=JSON.parse(readFileSync(
  fileURLToPath(new URL('../public/manifest.json',import.meta.url)),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const html='<html><head><script type="module" src="/assets/popup-abc123.js"></script>'+
  '<link rel="stylesheet" href="/assets/popup-abc123.css"></head><body></body></html>';

test('only the verified minimum-privilege Firefox manifest passes',()=>{
  assert.doesNotThrow(()=>validateManifest(clone(source)));
  for(const field of [
    ['permissions',['storage','activeTab','scripting','tabs']],
    ['host_permissions',['<all_urls>']],
    ['unexpectedFutureCapability',true],
    ['background',{service_worker:'worker.js'}],
    ['content_security_policy',{extension_pages:"script-src 'self' 'unsafe-eval'"}],
  ]){
    const altered=clone(source);
    altered[field[0]]=field[1];
    assert.throws(()=>validateManifest(altered));
  }
});

test('only local executable popup resources pass',()=>{
  assert.doesNotThrow(()=>validatePopup(html));
  assert.throws(()=>validatePopup(html.replace('/assets/popup-abc123.js',
    'https://not-local.example.invalid/payload.js')));
  assert.throws(()=>validatePopup(html.replace('<script','<script onload="unsafe()"')));
  assert.throws(()=>validatePopup(html+'<iframe src="https://example.invalid"></iframe>'));
  assert.throws(()=>validatePopup(html+'<div onclick="unsafe()"></div>'));
});

test('packaged development assets reject sourcemaps, unexpected files and symlinks',()=>{
  const dir=mkdtempSync(join(tmpdir(),'gcv-fox-package-'));
  try{
    mkdirSync(join(dir,'assets'));
    writeFileSync(join(dir,'manifest.json'),JSON.stringify(source));
    writeFileSync(join(dir,'popup.html'),html);
    writeFileSync(join(dir,'assets','popup-abc123.js'),'export const x=1;');
    writeFileSync(join(dir,'assets','popup-abc123.css'),'html{color:black}');
    assert.equal(validateBuild(dir),4);
    const map=join(dir,'assets','popup-abc123.js.map');
    writeFileSync(map,'source: fake');
    assert.throws(()=>validateBuild(dir));
    rmSync(map);
    symlinkSync('popup-abc123.js',join(dir,'assets','alias.js'));
    assert.throws(()=>validateBuild(dir));
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
});
