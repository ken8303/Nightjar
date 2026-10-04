import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {watchCameraLifecycle}=await vite.ssrLoadModule('/lib/camera-lifecycle.ts');
function harness(initial=false){
 const page=new EventTarget(),visibility=new EventTarget(),calls=[];let hidden=initial;
 const stop=watchCameraLifecycle(page,visibility,{hidden:()=>hidden,onSuspend:()=>calls.push('stop hardware'),onResume:()=>calls.push('refresh time')});
 return {calls,stop,page,visibility,hide:value=>{hidden=value;visibility.dispatchEvent(new Event('visibilitychange'))}};
}
test('visibility and history events suspend once and resume with a clock refresh only',()=>{
 const h=harness();h.hide(true);h.page.dispatchEvent(new Event('pagehide'));h.page.dispatchEvent(new Event('pageshow'));
 assert.deepEqual(h.calls,['stop hardware']);h.hide(false);h.page.dispatchEvent(new Event('pageshow'));
 assert.deepEqual(h.calls,['stop hardware','refresh time']);h.stop();
});
test('history navigation suspends even before visibility changes and pageshow refreshes a visible return',()=>{
 const h=harness();h.page.dispatchEvent(new Event('pagehide'));h.page.dispatchEvent(new Event('pagehide'));h.page.dispatchEvent(new Event('pageshow'));
 assert.deepEqual(h.calls,['stop hardware','refresh time']);h.hide(true);h.hide(false);
 assert.deepEqual(h.calls,['stop hardware','refresh time','stop hardware','refresh time']);h.stop();
});
test('initially hidden viewers suspend, and disposal removes every lifecycle listener',()=>{
 const h=harness(true);assert.deepEqual(h.calls,['stop hardware']);h.stop();h.hide(false);h.page.dispatchEvent(new Event('pageshow'));h.page.dispatchEvent(new Event('pagehide'));h.hide(true);
 assert.deepEqual(h.calls,['stop hardware']);
});
