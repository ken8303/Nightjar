import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchPwaRegistration}=await vite.ssrLoadModule('/lib/pwa-registration.ts');
class Worker extends EventTarget{constructor(state='installing'){super();this.state=state}send(state){this.state=state;this.dispatchEvent(new Event('statechange'))}}
class Registration extends EventTarget{active=null;installing=null;waiting=null;update(){this.dispatchEvent(new Event('updatefound'))}}
function watch(reg){const calls={ready:0,failed:0,waiting:[]};const stop=watchPwaRegistration(reg,{onReady:()=>calls.ready++,onFailure:()=>calls.failed++,onWaiting:worker=>calls.waiting.push(worker)});return {calls,stop}}
test('a fresh registration is not ready until activation and exposes its waiting worker without assuming a controller',()=>{
 const reg=new Registration(),worker=new Worker();reg.installing=worker;const f=watch(reg);assert.equal(f.calls.ready,0);
 reg.installing=null;reg.waiting=worker;worker.send('installed');assert.equal(f.calls.ready,0);assert.equal(f.calls.waiting.at(-1),worker);
 reg.waiting=null;reg.active=worker;worker.send('activated');assert.equal(f.calls.ready,1);assert.equal(f.calls.waiting.at(-1),null);f.stop();
});
test('failed installation can recover through a new worker and superseded events cannot overwrite success',()=>{
 const reg=new Registration(),old=new Worker();reg.installing=old;const f=watch(reg);old.send('redundant');assert.equal(f.calls.failed,1);
 const next=new Worker();reg.installing=next;reg.update();old.send('activated');assert.equal(f.calls.ready,0);
 reg.installing=null;reg.active=next;next.send('activated');assert.equal(f.calls.ready,1);old.send('redundant');assert.equal(f.calls.failed,1);f.stop();
});
test('existing activated support stays ready while waiting versions change, and the newest waiting worker is reported',()=>{
 const reg=new Registration();reg.active=new Worker('activated');const first=new Worker('installed');reg.waiting=first;const f=watch(reg);assert.equal(f.calls.ready,1);assert.equal(f.calls.waiting.at(-1),first);
 const next=new Worker();reg.waiting=null;reg.installing=next;reg.update();first.send('redundant');assert.equal(f.calls.failed,0);
 reg.installing=null;reg.waiting=next;next.send('installed');assert.equal(f.calls.waiting.at(-1),next);f.stop();
});
test('empty registrations can receive a later update and disposal ignores all subsequent events',()=>{
 const reg=new Registration(),f=watch(reg);assert.equal(f.calls.ready,0);assert.equal(f.calls.failed,0);
 const worker=new Worker();reg.installing=worker;reg.update();f.stop();const snapshot=structuredClone({...f.calls,waiting:f.calls.waiting.map(value=>value?.state??null)});
 reg.active=worker;reg.installing=null;worker.send('activated');reg.update();assert.deepEqual({...f.calls,waiting:f.calls.waiting.map(value=>value?.state??null)},snapshot);
});
