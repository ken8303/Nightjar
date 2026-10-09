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
 assert.deepEqual(f.events,['preserve',{type:'SKIP_WAITING'},'preserve','reload']);
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

test('unsaved view text blocks activation and a newly failed edit blocks reload after activation',()=>{
 const first=fixture();first.options.canReload=()=>false;applyPwaUpdate(first.worker,first.controller,first.options);assert.equal(first.events.length,1);assert.match(first.events[0].failure,/unsaved text/);first.controller.dispatchEvent(new Event('controllerchange'));assert.equal(first.events.length,1);
 let saved=true;const later=fixture();later.options.canReload=()=>saved;applyPwaUpdate(later.worker,later.controller,later.options);saved=false;later.controller.dispatchEvent(new Event('controllerchange'));assert.deepEqual(later.events.slice(0,2),['preserve',{type:'SKIP_WAITING'}]);assert.match(later.events[2].failure,/reload was paused/);saved=true;later.controller.dispatchEvent(new Event('controllerchange'));assert.equal(later.events.length,3);
 const valid=fixture(controller=>controller.dispatchEvent(new Event('controllerchange')));valid.options.canReload=()=>true;applyPwaUpdate(valid.worker,valid.controller,valid.options);assert.equal(valid.events.at(-1),'reload');
});


test('activation captures time changed during the waiting interval immediately before reload',()=>{
 let time='initial',preserved=[],reloads=[];const controller=new EventTarget();
 const options={preserve:()=>{preserved.push(time);return true},reload:()=>reloads.push(preserved.at(-1)),onFailure:()=>assert.fail('Unexpected failure'),timeoutMs:1000};
 const worker={state:'installed',postMessage:()=>{time='latest';controller.dispatchEvent(new Event('controllerchange'))}};
 applyPwaUpdate(worker,controller,options);controller.dispatchEvent(new Event('controllerchange'));
 assert.deepEqual(preserved,['initial','latest']);assert.deepEqual(reloads,['latest']);
});
test('failed time preservation pauses both initial activation and later reload without duplicate attempts',()=>{
 for(const throwError of [false,true]){
  let calls=0;const first=fixture();first.options.preserve=()=>{if(throwError)throw Error('denied');return false};applyPwaUpdate(first.worker,first.controller,first.options);
  assert.equal(first.events.length,1);assert.match(first.events[0].failure,/could not/);first.controller.dispatchEvent(new Event('controllerchange'));assert.equal(first.events.length,1);
  const later=fixture();later.options.preserve=()=>{calls++;if(calls===1)return true;if(throwError)throw Error('denied');return false};applyPwaUpdate(later.worker,later.controller,later.options);later.controller.dispatchEvent(new Event('controllerchange'));later.controller.dispatchEvent(new Event('controllerchange'));
  assert.equal(calls,2);assert.equal(later.events.length,2);assert.match(later.events[1].failure,/observing site and time could not be preserved/);assert(!later.events.includes('reload'));
 }
});
test('time tokens validate bounded canonical instants and report unavailable persistence without rewriting sources',async()=>{
 const {preservePlannerTime}=await vite.ssrLoadModule('/lib/reload-planner.ts');
 const expected='"2026-10-09T21:45:00.000Z"';
 for(const bad of [null,'','{','"2026-02-30T21:45:00.000Z"','"0000-01-01T00:00:00.000Z"','x'.repeat(129)]){
  const writes=[],session={getItem:key=>key==='nightjar-current-time-v1'?bad:null,setItem:(key,value)=>writes.push([key,value])};
  assert.equal(preservePlannerTime({getItem:()=>expected},session),true);assert.deepEqual(writes,[['nightjar-recovery-time-v1',expected]]);
 }
 const writes=[];assert.equal(preservePlannerTime({getItem:()=>'{bad'},{getItem:()=>'{bad',setItem:()=>writes.push('write')}),false);assert.deepEqual(writes,[]);
 assert.equal(preservePlannerTime({getItem:()=>expected},{getItem:()=>null,setItem:()=>{throw Error('denied')}}),false);
});
