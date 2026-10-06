import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {createCameraWakeLock}=await vite.ssrLoadModule('/lib/camera-wake-lock.ts');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
class Lock extends EventTarget{
 released=false;releases=0;
 async release(){this.releases++;this.end()}
 end(){this.released=true;this.dispatchEvent(new Event('release'))}
}
function harness(){
 const events={states:[],errors:0,released:0};
 const session=createCameraWakeLock({onState:state=>events.states.push(state),onError:()=>events.errors++,onReleased:()=>events.released++});return {session,events};
}
test('a lock starts only after a grant and explicit stop releases it without a system-release notice',async()=>{
 const {session,events}=harness(),lock=new Lock(),grant=deferred();
 const attempt=session.start(()=>grant.promise);assert.equal(events.states.at(-1),'requesting');grant.resolve(lock);
 assert.equal(await attempt,'started');assert.equal(events.states.at(-1),'on');session.stop();
 assert.equal(lock.releases,1);assert.equal(events.states.at(-1),'off');assert.equal(events.released,0);
});
test('late grants after cancellation or disposal release without reviving the viewer',async()=>{
 for(const notify of [true,false]){
  const {session,events}=harness(),lock=new Lock(),grant=deferred();
  const attempt=session.start(()=>grant.promise);session.stop(notify);const count=events.states.length;
  grant.resolve(lock);assert.equal(await attempt,'cancelled');assert.equal(lock.releases,1);assert.equal(events.states.length,count);assert.equal(events.released,0);
 }
});
test('old grants and failures cannot replace or clear a newer lock',async()=>{
 const {session,events}=harness(),oldGrant=deferred(),old=new Lock(),current=new Lock();
 const attempt=session.start(()=>oldGrant.promise);await session.start(async()=>current);oldGrant.resolve(old);
 assert.equal(await attempt,'cancelled');assert.equal(old.releases,1);assert.equal(current.releases,0);assert.equal(events.states.at(-1),'on');
 const failure=deferred(),failed=session.start(()=>failure.promise),newest=new Lock();await session.start(async()=>newest);failure.reject(Error('Old rejection'));
 assert.equal(await failed,'cancelled');assert.equal(events.errors,0);assert.equal(newest.releases,0);session.stop();
});
test('system release clears state once and a later explicit request can acquire a new lock',async()=>{
 const {session,events}=harness(),lock=new Lock();await session.start(async()=>lock);lock.end();lock.end();
 assert.equal(events.states.at(-1),'off');assert.equal(events.released,1);
 const next=new Lock();await session.start(async()=>next);lock.end();assert.equal(events.states.at(-1),'on');assert.equal(events.released,1);session.stop();
});
test('hidden viewers and already-released grants never show screen awake as active',async()=>{
 const {session,events}=harness(),hidden=new Lock();
 assert.equal(await session.start(async()=>hidden,()=>false),'cancelled');assert.equal(hidden.releases,1);assert.equal(events.states.at(-1),'off');
 const released=new Lock();released.end();assert.equal(await session.start(async()=>released),'released');assert.equal(events.released,1);assert(!events.states.includes('on'));
});
test('a current request failure offers recovery and release rejection is handled',async()=>{
 const {session,events}=harness();assert.equal(await session.start(async()=>{throw Error('Denied')}),'failed');assert.equal(events.errors,1);assert.equal(events.states.at(-1),'off');
 const lock=new Lock();lock.release=async()=>{throw Error('Already released')};await session.start(async()=>lock);session.stop();await Promise.resolve();assert.equal(events.states.at(-1),'off');
});
