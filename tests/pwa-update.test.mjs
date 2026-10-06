import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {applyPwaUpdate}=await vite.ssrLoadModule('/lib/pwa-update.ts');
const pause=()=>new Promise(resolve=>setTimeout(resolve,25));
function fixture(post){
 const events=[],controller=new EventTarget();
 const worker={state:'installed',postMessage:message=>{events.push(message);post?.(controller)}};
 const options={preserve:()=>events.push('preserve'),reload:()=>events.push('reload'),onFailure:message=>events.push({failure:message}),timeoutMs:5};
 return {events,controller,worker,options};
}
test('PWA activation preserves time before messaging and reloads exactly once',async()=>{
 const f=fixture(controller=>controller.dispatchEvent(new Event('controllerchange')));
 applyPwaUpdate(f.worker,f.controller,f.options);
 f.controller.dispatchEvent(new Event('controllerchange'));await pause();
 assert.deepEqual(f.events,['preserve',{type:'SKIP_WAITING'},'reload']);
});
test('stalled activation reports recovery and ignores late controller changes',async()=>{
 const f=fixture();applyPwaUpdate(f.worker,f.controller,f.options);await pause();
 assert.equal(f.events.length,3);assert.match(f.events[2].failure,/did not finish/);
 f.controller.dispatchEvent(new Event('controllerchange'));assert.equal(f.events.length,3);
});
test('postMessage failures report recovery without leaving an active reload listener',async()=>{
 const f=fixture(()=>{throw Error('Worker failed')});applyPwaUpdate(f.worker,f.controller,f.options);
 f.controller.dispatchEvent(new Event('controllerchange'));await pause();
 assert.equal(f.events.length,3);assert.match(f.events[2].failure,/could not start/);
});
test('disposing an update cancels its timeout and reload listener',async()=>{
 const f=fixture();const dispose=applyPwaUpdate(f.worker,f.controller,f.options);dispose();dispose();
 f.controller.dispatchEvent(new Event('controllerchange'));await pause();
 assert.deepEqual(f.events,['preserve',{type:'SKIP_WAITING'}]);
});
test('a stale waiting worker does not preserve time or receive activation messages',async()=>{
 const f=fixture();f.worker.state='activated';applyPwaUpdate(f.worker,f.controller,f.options);await pause();
 assert.equal(f.events.length,1);assert.match(f.events[0].failure,/no longer waiting/);
});

test('recovery preserves the current tab time when another tab changes shared storage',async()=>{
 const {savePlannerTime,preservePlannerTime}=await vite.ssrLoadModule('/lib/reload-planner.ts');
 const records=new Map(),one=new Map(),two=new Map();
 const storage=map=>({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)});
 const local=storage(records),first=storage(one),second=storage(two);
 savePlannerTime(new Date('2026-10-07T22:30:00Z'),local,first);
 savePlannerTime(new Date('2026-10-04T20:00:00Z'),local,second);
 preservePlannerTime(local,first);
 assert.equal(one.get('nightjar-recovery-time-v1'),'"2026-10-07T22:30:00.000Z"');
 assert.equal(records.get('nightjar-observing-time'),'"2026-10-04T20:00:00.000Z"');
 const blocked={setItem:()=>{throw Error('Blocked')}};
 savePlannerTime(new Date('2026-10-08T22:30:00Z'),blocked,first);
 preservePlannerTime({getItem:()=>{throw Error('Blocked')}},first);
 assert.equal(one.get('nightjar-recovery-time-v1'),'"2026-10-08T22:30:00.000Z"');
});
