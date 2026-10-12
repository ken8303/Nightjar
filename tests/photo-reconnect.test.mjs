import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchPhotoReconnect}=await vite.ssrLoadModule('/lib/photo-reconnect.ts');
function fixture(initialOnline=true){const page=new EventTarget(),visibility=new EventTarget();let visible=true,online=initialOnline,calls=0;const stop=watchPhotoReconnect(()=>calls++,page,visibility,{visible:()=>visible,online:()=>online});return {page,visibility,stop,calls:()=>calls,visible:value=>{visible=value},show:value=>{visible=value;visibility.dispatchEvent(new Event('visibilitychange'))},silentNetwork:value=>{online=value},network:value=>{online=value;page.dispatchEvent(new Event(value?'online':'offline'))}}}
test('visible reconnect refreshes once without retrying at mount or ordinary visibility return',()=>{
 const f=fixture();assert.equal(f.calls(),0);f.show(false);f.show(true);assert.equal(f.calls(),0);f.network(false);f.network(true);assert.equal(f.calls(),1);f.show(false);f.show(true);assert.equal(f.calls(),1);f.stop();
});
test('background reconnects coalesce and wait until visible and online together',()=>{
 const f=fixture();f.show(false);f.network(true);f.network(true);assert.equal(f.calls(),0);f.network(false);f.show(true);assert.equal(f.calls(),0);f.network(true);assert.equal(f.calls(),1);f.show(true);assert.equal(f.calls(),1);f.stop();
});
test('pagehide blocks reconnect and visibility callbacks until pageshow',()=>{
 const f=fixture();f.page.dispatchEvent(new Event('pagehide'));f.network(true);f.show(true);assert.equal(f.calls(),0);f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.calls(),1);f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.calls(),1);f.stop();
});
test('a cached-page return recovers a hidden reconnect without requiring visibilitychange',()=>{
 const f=fixture();f.page.dispatchEvent(new Event('pagehide'));f.show(false);f.network(true);f.visible(true);assert.equal(f.calls(),0);f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.calls(),1);f.stop();
});
test('disposing suspended recovery removes page listeners and ignores queued events',()=>{
 const f=fixture();f.page.dispatchEvent(new Event('pagehide'));f.show(false);f.network(true);f.stop();f.show(true);f.page.dispatchEvent(new Event('pageshow'));f.network(true);assert.equal(f.calls(),0);
});

test('an offline-mounted viewer detects restored connectivity on return without an online event',()=>{
 const f=fixture(false);assert.equal(f.calls(),0);f.page.dispatchEvent(new Event('pagehide'));f.silentNetwork(true);f.show(true);assert.equal(f.calls(),0);
 f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.calls(),1);f.page.dispatchEvent(new Event('pageshow'));f.show(true);assert.equal(f.calls(),1);f.stop();
});
test('observed offline state recovers on visible return when the online event was missed',()=>{
 const f=fixture();f.network(false);f.show(false);f.silentNetwork(true);f.show(true);assert.equal(f.calls(),1);f.show(true);assert.equal(f.calls(),1);f.stop();
});
test('pagehide samples an unnotified offline flag and defers recovery until pageshow',()=>{
 const f=fixture();f.silentNetwork(false);f.page.dispatchEvent(new Event('pagehide'));f.silentNetwork(true);f.show(true);assert.equal(f.calls(),0);
 f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.calls(),1);f.stop();f.silentNetwork(false);f.silentNetwork(true);f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.calls(),1);
});
