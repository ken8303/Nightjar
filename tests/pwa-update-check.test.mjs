import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {watchPwaUpdateChecks}=await vite.ssrLoadModule('/lib/pwa-update-check.ts');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(update,initial={}){
 let time=0,online=initial.online??true,visible=initial.visible??true,count=0,poll,cancelled=false,pollInterval;
 const tasks=[];
 const page=new EventTarget(),visibility=new EventTarget();
 const dispose=watchPwaUpdateChecks(()=>{count++;return update?.()??Promise.resolve()},page,visibility,{now:()=>time,online:()=>online,visible:()=>visible,schedule:(task,interval)=>{poll=task;pollInterval=interval;const entry={task,cancelled:false};tasks.push(entry);return()=>{cancelled=true;entry.cancelled=true}}});
 return {page,visibility,dispose,tasks,tick:()=>poll(),cancelled:()=>cancelled,pollInterval:()=>pollInterval,count:()=>count,time:value=>time=value,online:value=>online=value,visible:value=>visible=value};
}
test('returning to the app checks after a minute and coalesces repeated events',async()=>{
 const f=fixture();f.time(59999);f.visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.count(),0);
 f.time(60000);f.visibility.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(f.count(),1);
 f.page.dispatchEvent(new Event('pageshow'));f.page.dispatchEvent(new Event('online'));assert.equal(f.count(),1);
 f.time(120000);f.page.dispatchEvent(new Event('pageshow'));await settle();assert.equal(f.count(),2);f.dispose();
});
test('hidden and offline apps defer checks until both visible and online',async()=>{
 const f=fixture();f.time(60000);f.visible(false);f.page.dispatchEvent(new Event('online'));assert.equal(f.count(),0);
 f.visible(true);f.online(false);f.visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.count(),0);
 f.online(true);f.page.dispatchEvent(new Event('online'));await settle();assert.equal(f.count(),1);f.dispose();
});
test('pending checks cannot overlap and disposing removes event listeners',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve));
 f.time(60000);f.page.dispatchEvent(new Event('online'));f.time(120000);f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.count(),1);
 finish();await settle();f.visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.count(),2);
 finish();await settle();f.dispose();f.time(180000);f.page.dispatchEvent(new Event('online'));f.visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(f.count(),2);
});
test('failed background checks stay quiet and can retry after the cooldown',async()=>{
 const f=fixture(()=>Promise.reject(Error('Offline server')));f.time(60000);f.page.dispatchEvent(new Event('online'));await settle();assert.equal(f.count(),1);
 f.time(120000);f.page.dispatchEvent(new Event('pageshow'));await settle();assert.equal(f.count(),2);f.dispose();
});

test('a continuously open foreground app checks periodically and stops polling after disposal',async()=>{
 const f=fixture();assert.equal(f.pollInterval(),15*60*1000);
 f.time(15*60*1000);f.tick();await settle();assert.equal(f.count(),1);
 f.visible(false);f.time(30*60*1000);f.tick();assert.equal(f.count(),1);
 f.visible(true);f.online(false);f.tick();assert.equal(f.count(),1);
 f.online(true);f.tick();await settle();assert.equal(f.count(),2);
 f.dispose();assert.equal(f.cancelled(),true);f.time(45*60*1000);f.tick();assert.equal(f.count(),2);
});
test('periodic checks share the pending-request guard and event cooldown',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve));
 f.time(900000);f.tick();f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.count(),1);
 f.time(1800000);f.tick();assert.equal(f.count(),1);finish();await settle();
 f.tick();assert.equal(f.count(),2);finish();await settle();f.dispose();
});
test('hidden and offline transitions cancel polling; return refreshes once and ignores old queued ticks',async()=>{
 const f=fixture();assert.equal(f.tasks.length,1);
 f.visible(false);f.visibility.dispatchEvent(new Event('visibilitychange'));assert(f.tasks[0].cancelled);
 f.time(900000);f.tasks[0].task();assert.equal(f.count(),0);
 f.visible(true);f.visibility.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(f.count(),1);assert.equal(f.tasks.length,2);
 f.time(960000);f.tasks[0].task();assert.equal(f.count(),1);
 f.online(false);f.page.dispatchEvent(new Event('offline'));assert(f.tasks[1].cancelled);
 f.visible(false);f.visibility.dispatchEvent(new Event('visibilitychange'));
 f.online(true);f.page.dispatchEvent(new Event('online'));assert.equal(f.tasks.length,2);assert.equal(f.count(),1);
 f.visible(true);f.visibility.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(f.tasks.length,3);assert.equal(f.count(),2);
 f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.tasks.length,3);assert.equal(f.count(),2);f.dispose();assert(f.tasks[2].cancelled);
});
test('background or offline startup has no timer until available',async()=>{
 for(const initial of [{visible:false},{online:false}]){
  const f=fixture(undefined,initial);assert.equal(f.tasks.length,0);
  f.time(60000);f.visible(true);f.online(true);f.page.dispatchEvent(new Event('online'));await settle();assert.equal(f.tasks.length,1);assert.equal(f.count(),1);f.dispose();
 }
});
test('pagehide suspends even before visibility changes and pageshow resumes without duplicate timers',async()=>{
 const f=fixture();f.page.dispatchEvent(new Event('pagehide'));assert(f.tasks[0].cancelled);
 f.time(900000);f.visibility.dispatchEvent(new Event('visibilitychange'));f.page.dispatchEvent(new Event('online'));f.tasks[0].task();assert.equal(f.count(),0);assert.equal(f.tasks.length,1);
 f.page.dispatchEvent(new Event('pageshow'));await settle();assert.equal(f.count(),1);assert.equal(f.tasks.length,2);
 f.dispose();f.time(1800000);f.page.dispatchEvent(new Event('pageshow'));f.tasks[1].task();assert.equal(f.count(),1);assert.equal(f.tasks.length,2);
});

test('backward clock correction checks once on usable return and resets the cooldown',async()=>{
 const f=fixture();f.time(3600000);f.page.dispatchEvent(new Event('pageshow'));await settle();assert.equal(f.count(),1);
 f.page.dispatchEvent(new Event('pagehide'));f.time(1800000);f.visibility.dispatchEvent(new Event('visibilitychange'));f.tick();assert.equal(f.count(),1);
 f.page.dispatchEvent(new Event('pageshow'));await settle();assert.equal(f.count(),2);
 f.page.dispatchEvent(new Event('pageshow'));f.page.dispatchEvent(new Event('online'));f.tick();assert.equal(f.count(),2);
 f.time(1859999);f.tick();assert.equal(f.count(),2);
 f.time(1860000);f.tick();await settle();assert.equal(f.count(),3);f.dispose();
});
test('backward correction cannot overlap a pending check and failed checks retain the new cooldown',async()=>{
 let reject;const f=fixture(()=>new Promise((_,failure)=>reject=failure));
 f.time(3600000);f.tick();assert.equal(f.count(),1);
 f.time(1800000);f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.count(),1);
 reject(Error('Unavailable'));await settle();f.page.dispatchEvent(new Event('pageshow'));assert.equal(f.count(),2);
 reject(Error('Unavailable'));await settle();f.tick();assert.equal(f.count(),2);
 f.time(1860000);f.tick();assert.equal(f.count(),3);reject(Error('Unavailable'));await settle();f.dispose();
});
