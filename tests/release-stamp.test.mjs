import assert from 'node:assert/strict';
import {test,after} from 'node:test';
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
