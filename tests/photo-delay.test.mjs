import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchPhotoDelay}=await vite.ssrLoadModule('/lib/photo-delay.ts');
function fixture(){const element={},timers=new Map();let callback,disconnected=0,id=0;class Observer{constructor(cb){callback=cb}observe(target){assert.equal(target,element)}disconnect(){disconnected++}}return {element,timers,Observer,schedule:(callback,delay)=>{const timer=++id;timers.set(timer,{callback:()=>{timers.delete(timer);callback()},delay});return timer},cancel:id=>timers.delete(id),emit:visible=>callback([{target:element,isIntersecting:visible}]),disconnected:()=>disconnected}}
test('hidden lazy images do not time out, while visible images get one fifteen-second recovery offer',()=>{
 const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,f);assert.equal(f.timers.size,0);f.emit(false);assert.equal(f.timers.size,0);f.emit(true);f.emit(true);assert.equal(f.timers.size,1);const timer=[...f.timers.values()][0];assert.equal(timer.delay,15000);timer.callback();f.emit(true);assert.equal(calls,1);assert(f.disconnected()>0);cleanup();
});
test('hiding or unmounting cancels delayed work and queued expiry callbacks cannot update a disposed image',()=>{
 const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,f);f.emit(true);f.emit(false);assert.equal(f.timers.size,0);f.emit(true);const timer=[...f.timers.values()][0];cleanup();assert.equal(f.timers.size,0);timer.callback();assert.equal(calls,0);
});
test('missing or unavailable intersection observation still offers recovery and can be cleaned up',()=>{
 for(const Observer of [undefined,class {constructor(){throw Error('unsupported')}}]){const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,Observer});const timer=[...f.timers.values()][0];assert(timer);timer.callback();assert.equal(calls,1);cleanup()}
});
test('a queued expiry cannot show a warning after scrolling away or replace the next countdown',()=>{
 const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,f);
 f.emit(true);const stale=[...f.timers.values()][0];f.emit(false);stale.callback();assert.equal(calls,0);
 f.emit(true);const current=[...f.timers.values()][0];stale.callback();assert.equal(calls,0);assert.equal(f.timers.size,1);
 current.callback();assert.equal(calls,1);cleanup();
});
test('backgrounding cancels a visible image countdown and return starts a full new deadline',()=>{
 const f=fixture(),visibility=new EventTarget();visibility.hidden=false;let calls=0;
 const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,visibility});f.emit(true);const stale=[...f.timers.values()][0];
 visibility.hidden=true;visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.timers.size,0);stale.callback();assert.equal(calls,0);
 visibility.hidden=false;visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.timers.size,1);const current=[...f.timers.values()][0];assert.equal(current.delay,15000);
 stale.callback();assert.equal(calls,0);current.callback();assert.equal(calls,1);cleanup();
 visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.timers.size,0);
});
test('a background mount waits for visibility with and without intersection support',()=>{
 for(const missing of [false,true]){
  const f=fixture(),visibility=new EventTarget();visibility.hidden=true;let calls=0;
  const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,Observer:missing?undefined:f.Observer,visibility});if(!missing)f.emit(true);assert.equal(f.timers.size,0);
  visibility.hidden=false;visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.timers.size,1);[...f.timers.values()][0].callback();assert.equal(calls,1);cleanup();
 }
});
test('hidden state at expiry suppresses a warning even before its event, and later return can retry',()=>{
 const f=fixture(),visibility=new EventTarget();visibility.hidden=false;let calls=0;
 const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,visibility});f.emit(true);const stale=[...f.timers.values()][0];visibility.hidden=true;stale.callback();assert.equal(calls,0);
 visibility.hidden=false;visibility.dispatchEvent(new Event('visibilitychange'));const current=[...f.timers.values()].at(-1);assert.notEqual(current,stale);current.callback();assert.equal(calls,1);cleanup();
});

test('pagehide pauses a visible image deadline before visibility changes and restore starts afresh',()=>{
 const f=fixture(),visibility=new EventTarget(),pageEvents=new EventTarget();visibility.hidden=false;let calls=0;
 const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,visibility,pageEvents});f.emit(true);const stale=[...f.timers.values()][0];
 pageEvents.dispatchEvent(new Event('pagehide'));assert.equal(f.timers.size,0);stale.callback();assert.equal(calls,0);
 visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.timers.size,0);
 pageEvents.dispatchEvent(new Event('pageshow'));assert.equal(f.timers.size,1);const current=[...f.timers.values()][0];assert.equal(current.delay,15000);
 stale.callback();assert.equal(calls,0);current.callback();assert.equal(calls,1);assert.equal(f.timers.size,0);
 pageEvents.dispatchEvent(new Event('pageshow'));assert.equal(f.timers.size,0);cleanup();
});
test('restored hidden or offscreen images wait for availability and disposal removes page listeners',()=>{
 for(const offscreen of [false,true]){
  const f=fixture(),visibility=new EventTarget(),pageEvents=new EventTarget();visibility.hidden=false;let calls=0;
  const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,visibility,pageEvents});f.emit(true);pageEvents.dispatchEvent(new Event('pagehide'));
  if(offscreen)f.emit(false);else visibility.hidden=true;
  pageEvents.dispatchEvent(new Event('pageshow'));assert.equal(f.timers.size,0);
  if(offscreen)f.emit(true);else{visibility.hidden=false;visibility.dispatchEvent(new Event('visibilitychange'))}
  assert.equal(f.timers.size,1);cleanup();pageEvents.dispatchEvent(new Event('pagehide'));pageEvents.dispatchEvent(new Event('pageshow'));assert.equal(f.timers.size,0);assert.equal(calls,0);
 }
});
