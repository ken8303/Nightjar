import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchForecastRefresh}=await vite.ssrLoadModule('/lib/forecast-refresh.ts');
function harness(initialOnline=true){
 const page=new EventTarget(),visibility=new EventTarget();let hidden=false,online=initialOnline,time=0,attempted=0,calls=0;const ticks=[];
 const stop=watchForecastRefresh(()=>{calls++;attempted=time},page,visibility,{hidden:()=>hidden,online:()=>online,attemptedAt:()=>attempted,now:()=>time,maxAge:900000,schedule:tick=>{const task={tick,cancelled:false};ticks.push(task);return()=>{task.cancelled=true}}});
 return {page,stop,ticks,manual:()=>{calls++;attempted=time},get calls(){return calls},time:value=>{time=value},visible:value=>{hidden=!value;visibility.dispatchEvent(new Event('visibilitychange'))},silentNetwork:value=>{online=value},network:value=>{online=value;page.dispatchEvent(new Event(value?'online':'offline'))}};
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

test('an explicit refresh satisfies a remembered reconnect instead of causing another early request',()=>{
 const h=harness();h.time(999);h.network(true);assert.equal(h.calls,0);h.time(1000);h.manual();assert.equal(h.calls,1);h.time(5000);h.ticks.at(-1).tick();assert.equal(h.calls,1);h.time(901000);h.ticks.at(-1).tick();assert.equal(h.calls,2);h.stop();
});
test('a backward clock correction refreshes once on usable return and resets the normal cadence',()=>{
 const h=harness();h.time(3600000);h.manual();assert.equal(h.calls,1);
 h.page.dispatchEvent(new Event('pagehide'));h.time(1800000);h.visible(true);assert.equal(h.calls,1);
 h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,2);
 h.page.dispatchEvent(new Event('pageshow'));h.ticks.at(-1).tick();assert.equal(h.calls,2);
 h.time(2699999);h.ticks.at(-1).tick();assert.equal(h.calls,2);
 h.time(2700000);h.ticks.at(-1).tick();assert.equal(h.calls,3);h.stop();
});

test('offline mount detects a silent reconnection on pageshow before the normal refresh age',()=>{
 const h=harness(false);h.time(61000);h.page.dispatchEvent(new Event('pagehide'));h.silentNetwork(true);h.visible(true);assert.equal(h.calls,0);
 h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);h.page.dispatchEvent(new Event('pageshow'));h.visible(true);assert.equal(h.calls,1);h.stop();
});
test('observed offline connectivity detects missed online events on visible return',()=>{
 const h=harness();h.time(61000);h.network(false);h.visible(false);h.silentNetwork(true);h.visible(true);assert.equal(h.calls,1);h.visible(true);assert.equal(h.calls,1);h.stop();
});
test('pagehide samples a silent offline state and an explicit refresh satisfies its restored connection',()=>{
 const h=harness();h.time(61000);h.silentNetwork(false);h.page.dispatchEvent(new Event('pagehide'));h.silentNetwork(true);h.visible(true);assert.equal(h.calls,0);
 h.manual();assert.equal(h.calls,1);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);h.time(66000);h.ticks.at(-1).tick();assert.equal(h.calls,1);h.stop();
});

test('pagehide samples an unnotified offline flag and refreshes once after a silent return',()=>{
 const h=harness();h.time(61000);h.silentNetwork(false);h.page.dispatchEvent(new Event('pagehide'));h.silentNetwork(true);h.visible(true);assert.equal(h.calls,0);
 h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);h.stop();h.time(2000000);h.network(false);h.silentNetwork(true);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.calls,1);
});
