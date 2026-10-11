import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchForecastRefresh}=await vite.ssrLoadModule('/lib/forecast-refresh.ts');
function harness(){
 const page=new EventTarget(),visibility=new EventTarget();let hidden=false,online=true,time=0,attempted=0,calls=0;const ticks=[];
 const stop=watchForecastRefresh(()=>{calls++;attempted=time},page,visibility,{hidden:()=>hidden,online:()=>online,attemptedAt:()=>attempted,now:()=>time,maxAge:900000,schedule:tick=>{const task={tick,cancelled:false};ticks.push(task);return()=>{task.cancelled=true}}});
 return {page,stop,ticks,get calls(){return calls},time:value=>{time=value},visible:value=>{hidden=!value;visibility.dispatchEvent(new Event('visibilitychange'))},network:value=>{online=value;page.dispatchEvent(new Event(value?'online':'offline'))}};
}
test('foreground reconnect and regular return share the request throttle',()=>{
 const h=harness();h.time(999);h.network(true);assert.equal(h.calls,0);h.time(1000);h.network(true);h.network(true);assert.equal(h.calls,1);h.time(901000);h.visible(true);assert.equal(h.calls,2);h.stop();
});
test('reconnect during page suspension waits for pageshow even while document visibility is stale',()=>{
 const h=harness();h.time(61000);h.page.dispatchEvent(new Event('pagehide'));h.network(false);h.network(true);h.visible(true);assert.equal(h.calls,0);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);h.stop();
});
test('hidden reconnect is remembered for return even if the normal maximum age has not passed',()=>{
 const h=harness();h.time(61000);h.visible(false);h.network(false);h.network(true);h.network(true);assert.equal(h.calls,0);h.visible(true);assert.equal(h.calls,1);h.stop();
});
test('a hidden pageshow defers reconnect work until visible and disposal rejects cancelled ticks',()=>{
 const h=harness();h.time(61000);h.page.dispatchEvent(new Event('pagehide'));h.visible(false);h.network(true);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,0);h.visible(true);assert.equal(h.calls,1);h.stop();h.time(2000000);for(const task of h.ticks)task.tick();h.network(true);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);
});
