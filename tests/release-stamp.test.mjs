import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {stampServiceWorker}=await vite.ssrLoadModule('/build/nightjar-release.ts');
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
 assert.equal(cache,'nightjar-offline-v7-'+release);assert.equal(first,stampServiceWorker(source,[...files].reverse()));
 for(const changed of [[['offline.html','new'],files[1],files[2]],[files[0],['planner-recovery.mjs','new'],files[2]],[files[0],files[1],['app.js','new']]])assert.notEqual(cache,stampServiceWorker(source,changed).match(/const CACHE = '([^']+)';/)[1]);
 assert.match(first,/const STATIC_CACHE = 'nightjar-static-v1'/);
});
