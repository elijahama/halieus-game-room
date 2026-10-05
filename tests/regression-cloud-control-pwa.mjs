import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const meta=JSON.parse(await read('assets/branding/references/control-pwa-export.json'));
for(const [path,hash] of [['assets/branding/references/'+meta.source,meta.sourceSha256],[meta.export,meta.sha256]]){
 const bytes=await readFile(new URL('../'+path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
 if(path===meta.export){assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),512);}
}
const manifest=JSON.parse(await read('client/public/control/manifest.webmanifest'));
assert.equal(manifest.scope,'/control/');assert.equal(manifest.id,'/control/');assert.equal(manifest.display,'standalone');
assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512']);
for(const [path,prefix] of [['client/public/sw.js','halieus-shell-'],['client/public/control/sw.js','hgr-cloud-control-']]){
 const handlers={},deleted=[];let completion;
 const context={URL,Promise,self:{location:{href:'http://localhost/sw.js',origin:'http://localhost'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:()=>Promise.resolve()}},caches:{keys:async()=>['halieus-shell-old','hgr-cloud-control-old','private-control-cache'],delete:async key=>deleted.push(key)},fetch:()=>{throw Error('unexpected fetch')}};
 vm.runInNewContext(await read(path),context);
 handlers.activate({waitUntil:promise=>completion=promise});await completion;
 assert.deepEqual(deleted,[prefix+'old'],'workers only retire their own cache family');
 for(const pathname of ['/control/cloud/status','/control/operation-status','/control/operation-history','/auth/status','/admin/snapshot']){
  let intercepted=false;handlers.fetch({request:{url:'http://localhost'+pathname,method:'GET',mode:'cors'},respondWith:()=>intercepted=true});
  assert.equal(intercepted,false,`${path}: ${pathname} must remain uncached`);
 }
}
console.log('PASS Cloud Control install identity, approved export and administrative cache isolation');
