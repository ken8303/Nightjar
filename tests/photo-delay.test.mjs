import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchPhotoDelay}=await vite.ssrLoadModule('/lib/photo-delay.ts');
function fixture(){const element={},timers=new Map();let callback,disconnected=0,id=0;class Observer{constructor(cb){callback=cb}observe(target){assert.equal(target,element)}disconnect(){disconnected++}}return {element,timers,Observer,schedule:(callback,delay)=>{timers.set(++id,{callback,delay});return id},cancel:id=>timers.delete(id),emit:visible=>callback([{target:element,isIntersecting:visible}]),disconnected:()=>disconnected}}
test('hidden lazy images do not time out, while visible images get one fifteen-second recovery offer',()=>{
 const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,f);assert.equal(f.timers.size,0);f.emit(false);assert.equal(f.timers.size,0);f.emit(true);f.emit(true);assert.equal(f.timers.size,1);const timer=[...f.timers.values()][0];assert.equal(timer.delay,15000);timer.callback();f.emit(true);assert.equal(calls,1);assert(f.disconnected()>0);cleanup();
});
test('hiding or unmounting cancels delayed work and queued expiry callbacks cannot update a disposed image',()=>{
 const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,f);f.emit(true);f.emit(false);assert.equal(f.timers.size,0);f.emit(true);const timer=[...f.timers.values()][0];cleanup();assert.equal(f.timers.size,0);timer.callback();assert.equal(calls,0);
});
test('missing or unavailable intersection observation still offers recovery and can be cleaned up',()=>{
 for(const Observer of [undefined,class {constructor(){throw Error('unsupported')}}]){const f=fixture();let calls=0;const cleanup=watchPhotoDelay(f.element,()=>calls++,{...f,Observer});const timer=[...f.timers.values()][0];assert(timer);timer.callback();assert.equal(calls,1);cleanup()}
});
