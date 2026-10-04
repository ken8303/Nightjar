import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {watchPwaUpdateChecks}=await vite.ssrLoadModule('/lib/pwa-update-check.ts');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(update){
 let time=0,online=true,visible=true,count=0;
 const page=new EventTarget(),visibility=new EventTarget();
 const dispose=watchPwaUpdateChecks(()=>{count++;return update?.()??Promise.resolve()},page,visibility,{now:()=>time,online:()=>online,visible:()=>visible});
 return {page,visibility,dispose,count:()=>count,time:value=>time=value,online:value=>online=value,visible:value=>visible=value};
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
