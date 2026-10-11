import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {watchDiaryRefresh}=await vite.ssrLoadModule('/lib/diary-refresh.ts');
function harness(){
 const page=new EventTarget(),visibility=new EventTarget(),storage={};let hidden=false,saved=['original'],shown=[],reads=0;
 const read=()=>{reads++;shown=[...saved]};
 const stop=watchDiaryRefresh(read,page,visibility,{storage:()=>storage,key:'diary',hidden:()=>hidden});
 return {page,stop,get reads(){return reads},get shown(){return shown},save:value=>{saved=value},visible:value=>{hidden=!value;visibility.dispatchEvent(new Event('visibilitychange'))},stored:(key,area=storage)=>{const e=new Event('storage');Object.assign(e,{key,storageArea:area});page.dispatchEvent(e)}};
}
test('cached-page return rereads the latest observations without needing a storage event',()=>{
 const h=harness();assert.equal(h.reads,0);h.page.dispatchEvent(new Event('pagehide'));h.save(['new observation']);h.page.dispatchEvent(new Event('pageshow'));assert.deepEqual(h.shown,['new observation']);h.stop();
});
test('hidden storage changes coalesce until a visible return',()=>{
 const h=harness();h.visible(false);h.save(['first']);h.stored('diary');h.save(['latest']);h.stored('diary');assert.equal(h.reads,0);h.visible(true);assert.equal(h.reads,1);assert.deepEqual(h.shown,['latest']);h.stop();
});
test('visibility cannot resume cached-page reads before pageshow and hidden pageshow waits',()=>{
 const h=harness();h.page.dispatchEvent(new Event('pagehide'));h.visible(true);h.stored('diary');assert.equal(h.reads,0);h.visible(false);h.page.dispatchEvent(new Event('pageshow'));assert.equal(h.reads,0);h.visible(true);assert.equal(h.reads,1);h.stop();
});
test('only matching local storage changes and clear trigger a foreground read',()=>{
 const h=harness();h.stored('unrelated');h.stored('diary',{});h.stored(null,{});assert.equal(h.reads,0);h.stored('diary');h.stored(null);assert.equal(h.reads,2);h.stop();
});
test('disposal removes all saved-observation refresh listeners',()=>{
 const h=harness();h.stop();h.stored('diary');h.page.dispatchEvent(new Event('pageshow'));h.visible(true);assert.equal(h.reads,0);
});
test('unavailable storage does not throw during setup or matching change recovery',()=>{
 const page=new EventTarget(),visibility=new EventTarget();let reads=0;
 const stop=watchDiaryRefresh(()=>reads++,page,visibility,{storage:()=>{throw Error('Storage disabled')},key:'diary',hidden:()=>false});
 assert.equal(reads,0);const change=new Event('storage');Object.assign(change,{key:'diary',storageArea:null});page.dispatchEvent(change);assert.equal(reads,1);stop();
});
