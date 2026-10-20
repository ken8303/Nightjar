import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,readdir,cp,rm,symlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {checkClientRelease} from '../scripts/release-assets.mjs';
import {stampServiceWorker} from '../scripts/release-hash.mjs';

async function fixture(t,{entry='import "./b.js";',includeB=true}={}){
 const root=await mkdtemp(join(tmpdir(),'nightjar-asset-gate-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const source=join(root,'source'),build=join(root,'build'),client=join(build,'client'),publicRoot=join(source,'public');
 await mkdir(join(publicRoot,'icons'),{recursive:true});
 const worker="const CACHE = 'nightjar-offline-v7';\nconst STATIC_CACHE = 'nightjar-static-v1';";
 const manifest=JSON.stringify({id:'/',start_url:'/',scope:'/',display:'standalone'});
 for(const [name,data] of [['sw.js',worker],['offline.html','<!doctype html>offline'],['planner-recovery.mjs','export const recovery=true'],['manifest.webmanifest',manifest]])await writeFile(join(publicRoot,name),data);
 for(const name of ['icon-192.png','icon-512.png','maskable-512.png','apple-touch-icon.png'])await writeFile(join(publicRoot,'icons',name),await readFile(new URL('../public/icons/'+name,import.meta.url)));
 await cp(publicRoot,client,{recursive:true});
 const inputs=[['offline.html','<!doctype html>offline'],['planner-recovery.mjs','export const recovery=true'],['_next/static/chunks/a.js',entry],['.assetsignore','node_modules\n']];
 if(includeB)inputs.push(['_next/static/chunks/b.js','export const value=1']);
 for(const [name,data] of inputs){await mkdir(dirname(join(client,name)),{recursive:true});await writeFile(join(client,name),name==='.assetsignore'?data+'.vite\n':data)}
 await writeFile(join(client,'_headers'),'generated headers');
 await writeFile(join(client,'sw.js'),stampServiceWorker(worker,inputs));
 return {source,build,client,publicRoot,worker,inputs};
}

test('the artifact gate verifies the built fingerprint, literal imports, recovery, manifest and icon headers without mutation',async t=>{
 const f=await fixture(t),before=await readFile(join(f.client,'sw.js'));
 const result=await checkClientRelease(f.build,f.source);
 assert.match(result.release,/^[a-f0-9]{64}$/);assert.equal(result.inputs,5);assert.equal(result.references,1);assert.equal(result.manifestIcons,'pass');assert.equal(result.recoveryBytes,'pass');
 assert.deepEqual(await checkClientRelease(f.build,f.source),result);assert((await readFile(join(f.client,'sw.js'))).equals(before));
});
test('changed app bytes and unexpected ignore-file additions cannot reuse an old offline fingerprint',async t=>{
 for(const name of ['_next/static/chunks/a.js','.assetsignore']){
  const f=await fixture(t);await writeFile(join(f.client,name),'changed generated content\n.vite\n');
  await assert.rejects(checkClientRelease(f.build,f.source),/fingerprint/);
 }
});
test('a matching fingerprint cannot hide a missing generated import',async t=>{
 const f=await fixture(t,{entry:'import "./missing.js";',includeB:false});
 await assert.rejects(checkClientRelease(f.build,f.source),/Missing generated import/);
});
test('a generated import cannot escape the isolated client root',async t=>{
 const f=await fixture(t,{entry:'import "../../../../outside.js";'});
 await assert.rejects(checkClientRelease(f.build,f.source),/leaves the client build/);
});
test('source changes to recovery or manifest files require a rebuild even if the old emitted fingerprint still matches',async t=>{
 for(const name of ['offline.html','planner-recovery.mjs','manifest.webmanifest']){
  const f=await fixture(t);await writeFile(join(f.publicRoot,name),'new public source');
  await assert.rejects(checkClientRelease(f.build,f.source),/differs from its public source/);
 }
});
test('corrupt icon signatures or dimensions and changed app identity fail packaging',async t=>{
 for(const mutation of ['signature','dimensions','identity','source-icon']){
  const f=await fixture(t);
  if(mutation==='source-icon'){
   const path=join(f.publicRoot,'icons/icon-192.png'),bytes=await readFile(path);bytes[40]^=1;await writeFile(path,bytes);
  }else if(mutation==='identity'){
   const changed=JSON.stringify({id:'/other',start_url:'/',scope:'/',display:'standalone'});
   await writeFile(join(f.client,'manifest.webmanifest'),changed);await writeFile(join(f.publicRoot,'manifest.webmanifest'),changed);
  }else{
   const path=join(f.client,'icons/icon-192.png'),bytes=await readFile(path);
   if(mutation==='signature')bytes[0]=0;else bytes.writeUInt32BE(191,16);
   await writeFile(path,bytes);
  }
  await assert.rejects(checkClientRelease(f.build,f.source),mutation==='identity'?/unexpected identity/:mutation==='source-icon'?/differs from its public source/:/Invalid built app icon/);
 }
});
test('unexpected links and a source worker without a versioned cache are rejected',async t=>{
 const f=await fixture(t);await symlink(join(f.publicRoot,'offline.html'),join(f.client,'linked.html'));
 await assert.rejects(checkClientRelease(f.build,f.source),/symbolic links/);await rm(join(f.client,'linked.html'));
 await writeFile(join(f.publicRoot,'sw.js'),'unversioned worker');
 await assert.rejects(checkClientRelease(f.build,f.source),/versioned Nightjar cache/);
});


test('the real packaging command rejects a bad snapshot before invoking Wrangler and cleans its temporary stage',async t=>{
 const f=await fixture(t),scripts=join(f.source,'scripts'),staging=join(f.source,'temporary-stages');
 await mkdir(scripts);await mkdir(staging);
 for(const name of ['run-cloudflare.mjs','stage-cloudflare-build.mjs','release-assets.mjs','release-hash.mjs'])await writeFile(join(scripts,name),await readFile(new URL('../scripts/'+name,import.meta.url)));
 await cp(f.build,join(f.source,'dist'),{recursive:true});
 const server=join(f.source,'dist/server');await mkdir(server);
 await writeFile(join(server,'index.js'),'export default {};');
 await writeFile(join(server,'wrangler.json'),JSON.stringify({name:'nightjar',main:'index.js',assets:{directory:'../client'}}));
 await writeFile(join(f.source,'dist/client/manifest.webmanifest'),'stale build manifest');
 const result=spawnSync(process.execPath,[join(scripts,'run-cloudflare.mjs'),'check'],{cwd:f.source,encoding:'utf8',timeout:10000,env:{...process.env,TMPDIR:staging,TMP:staging,TEMP:staging}});
 assert.equal(result.error,undefined);assert.equal(result.status,1);
 assert.match(result.stderr,/Built manifest.webmanifest differs from its public source/);
 assert.doesNotMatch(result.stdout,/Prepared isolated|Verified release assets|Wrangler/);
 assert.deepEqual(await readdir(staging),[],'the rejected snapshot must not leave a temporary deployment tree');
});
