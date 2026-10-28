import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {stampServiceWorker,nightjarRelease}=await vite.ssrLoadModule('/build/nightjar-release.ts');
test('app-only changes produce a different worker while unchanged builds remain stable',()=>{
 const worker='self.addEventListener("fetch",()=>{});';
 const files=[['app.js','version one'],['app.css','body{}']];
 const before=stampServiceWorker(worker,files);
 assert.equal(before,stampServiceWorker(worker,[...files].reverse()));
 assert.notEqual(before,stampServiceWorker(worker,[['app.js','version two'],files[1]]));
 assert(before.endsWith(worker));
});
test('offline-page changes and worker changes both produce a release update',()=>{
 assert.notEqual(stampServiceWorker('worker',[['offline.html','old']]),stampServiceWorker('worker',[['offline.html','new']]));
 assert.notEqual(stampServiceWorker('worker',[]),stampServiceWorker('new worker',[]));
 assert.notEqual(stampServiceWorker('worker',[['planner-recovery.mjs','old']]),stampServiceWorker('worker',[['planner-recovery.mjs','new']]));
});

test('real workers namespace offline files by the same stable release hash as their built assets',()=>{
 const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),files=[['offline.html','old'],['planner-recovery.mjs','module'],['app.js','app']];
 const first=stampServiceWorker(source,files),release=first.match(/^\/\/ Nightjar release: ([a-f0-9]{64})/)[1],cache=first.match(/const CACHE = '([^']+)';/)[1];
 assert.equal(cache,'nightjar-offline-v33-'+release);assert.equal(first,stampServiceWorker(source,[...files].reverse()));
 for(const changed of [[['offline.html','new'],files[1],files[2]],[files[0],['planner-recovery.mjs','new'],files[2]],[files[0],files[1],['app.js','new']]])assert.notEqual(cache,stampServiceWorker(source,changed).match(/const CACHE = '([^']+)';/)[1]);
 assert.match(first,/const STATIC_CACHE = 'nightjar-static-v1'/);
});

test('the client build hook stamps chunks, CSS and hidden emitted assets together with recovery files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'nightjar-release-hook-'));
 try{
  await mkdir(join(root,'public'));await mkdir(join(root,'client'));
  const source="const CACHE = 'nightjar-offline-v7';\nconst STATIC_CACHE = 'nightjar-static-v1';";
  await writeFile(join(root,'public/sw.js'),source);
  await writeFile(join(root,'public/offline.html'),'offline');
  await writeFile(join(root,'public/planner-recovery.mjs'),'recovery');
  await writeFile(join(root,'public/offline-darkness.mjs'),'darkness');
  const plugin=nightjarRelease();plugin.configResolved({root});
  assert.equal(plugin.applyToEnvironment({name:'client'}),true);
  assert.equal(plugin.applyToEnvironment({name:'rsc'}),false);
  const bundle={
   'app.js':{type:'chunk',code:'app'},
   'app.css':{type:'asset',source:new Uint8Array(Buffer.from('css'))},
   '.assetsignore':{type:'asset',source:'ignored'},
  };
  const build=async()=>{await plugin.writeBundle({dir:'client'},bundle);return readFile(join(root,'client/sw.js'),'utf8')};
  const original=await build();
  assert.equal(original,stampServiceWorker(source,[['offline.html','offline'],['planner-recovery.mjs','recovery'],['offline-darkness.mjs','darkness'],['app.js','app'],['app.css','css'],['.assetsignore','ignored']]));
  for(const [name,key] of [['app.js','code'],['app.css','source'],['.assetsignore','source']]){
   const before=bundle[name][key];bundle[name][key]='changed';assert.notEqual(await build(),original);bundle[name][key]=before;
  }
  await writeFile(join(root,'public/planner-recovery.mjs'),'new recovery');assert.notEqual(await build(),original);
 }finally{await rm(root,{recursive:true,force:true})}
});
