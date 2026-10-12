import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchForegroundDelay}=await vite.ssrLoadModule('/lib/foreground-delay.ts');
function fixture(initialHidden=false){
 const page=new EventTarget(),visibility=new EventTarget(),timers=[];let hidden=initialHidden,calls=0;
 const stop=watchForegroundDelay(()=>calls++,page,visibility,{hidden:()=>hidden,schedule:(callback,delay)=>{timers.push({callback,delay,active:true});return timers.length},cancel:id=>{timers[id-1].active=false}});
 return {page,timers,stop,get calls(){return calls},get active(){return timers.filter(t=>t.active).length},visible:value=>{hidden=!value;visibility.dispatchEvent(new Event('visibilitychange'))},setHidden:value=>{hidden=value},fire:timer=>{timer.active=false;timer.callback()}};
}
test('a foreground loading view gets one deadline and removes listeners after its offer',()=>{
 const h=fixture();assert.equal(h.active,1);assert.equal(h.timers[0].delay,15000);h.visible(true);assert.equal(h.timers.length,1);h.fire(h.timers[0]);assert.equal(h.calls,1);h.page.dispatchEvent(new Event('pageshow'));h.visible(true);h.fire(h.timers[0]);assert.equal(h.calls,1);assert.equal(h.active,0);h.stop();
});
test('background mounting waits and a visibility return starts a fresh complete countdown',()=>{
 const h=fixture(true);assert.equal(h.active,0);h.visible(true);const old=h.timers[0];h.visible(false);assert.equal(h.active,0);h.fire(old);assert.equal(h.calls,0);h.visible(true);assert.equal(h.active,1);assert.equal(h.timers[1].delay,15000);h.fire(old);assert.equal(h.active,1);assert.equal(h.calls,0);h.fire(h.timers[1]);assert.equal(h.calls,1);h.stop();
});
test('page suspension blocks visible events until pageshow and hidden pageshow still waits',()=>{
 const h=fixture();const old=h.timers[0];h.page.dispatchEvent(new Event('pagehide'));assert.equal(h.active,0);h.visible(true);assert.equal(h.active,0);h.fire(old);assert.equal(h.calls,0);h.visible(false);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.active,0);h.visible(true);assert.equal(h.active,1);h.fire(h.timers[1]);assert.equal(h.calls,1);h.stop();
});
test('an unannounced hidden expiry does not show an offer and visible return can retry',()=>{
 const h=fixture();h.setHidden(true);h.fire(h.timers[0]);assert.equal(h.calls,0);h.visible(true);assert.equal(h.active,1);h.fire(h.timers[1]);assert.equal(h.calls,1);h.stop();
});
test('disposal cancels deadlines and stale lifecycle callbacks cannot update a closed view',()=>{
 const h=fixture();h.stop();assert.equal(h.active,0);h.fire(h.timers[0]);h.page.dispatchEvent(new Event('pagehide'));h.page.dispatchEvent(new Event('pageshow'));h.visible(true);assert.equal(h.calls,0);assert.equal(h.timers.length,1);
});
