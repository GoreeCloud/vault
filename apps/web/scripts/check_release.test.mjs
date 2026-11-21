import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expectedCsp,verifyIndex,verifyDist} from './check_release.mjs';

const html='<!doctype html><html><head>'+
  '<meta name="referrer" content="no-referrer"/>'+
  '<meta http-equiv="Content-Security-Policy" content="'+expectedCsp+'"/>'+
  '<script type="module" src="/assets/index-safe123.js"></script>'+
  '<link rel="stylesheet" href="/assets/index-safe123.css"></head>'+
  '<body><div id="root"></div></body></html>';

test('only local scripts and a network-disabled production CSP pass',()=>{
  assert.doesNotThrow(()=>verifyIndex(html));
  assert.throws(()=>verifyIndex(html.replace("connect-src 'none'","connect-src 'self'")));
  assert.throws(()=>verifyIndex(html.replace("worker-src 'none'","worker-src 'self'")));
  assert.throws(()=>verifyIndex(html.replace("script-src 'self'","script-src 'self' 'unsafe-inline'")));
  assert.throws(()=>verifyIndex(html.replace('/assets/index-safe123.js',
    'https://example.invalid/inject.js')));
  assert.throws(()=>verifyIndex(html+'<div onclick="unsafe()"></div>'));
  assert.throws(()=>verifyIndex(html+'<iframe src="https://example.invalid"></iframe>'));
  assert.throws(()=>verifyIndex(html+'<meta http-equiv="refresh" content="0;url=/"/>'));
});

test('production package only contains a reviewed HTML, JS and CSS, never maps or symlinks',()=>{
  const folder=mkdtempSync(join(tmpdir(),'gcv-web-bundle-'));
  try{
    mkdirSync(join(folder,'assets'));
    writeFileSync(join(folder,'index.html'),html);
    writeFileSync(join(folder,'assets','index-safe123.js'),'export const synthetic=true;');
    writeFileSync(join(folder,'assets','index-safe123.css'),'html{color:black}');
    assert.equal(verifyDist(folder),3);
    const map=join(folder,'assets','index-safe123.js.map');
    writeFileSync(map,'mock source map');
    assert.throws(()=>verifyDist(folder));
    rmSync(map);
    symlinkSync('index-safe123.js',join(folder,'assets','alias.js'));
    assert.throws(()=>verifyDist(folder));
  }finally{
    rmSync(folder,{force:true,recursive:true});
  }
});
