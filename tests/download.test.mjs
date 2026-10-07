import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {downloadFile}=await vite.ssrLoadModule('/lib/download.ts');
function browser(t,{failClick=false,failAppend=false,failURL=false}={}){
 const events=[],timers=[],blob=new Blob(['M31,35°\n'],{type:'text/csv;charset=utf-8'});
 let connected=false;
 const link={click(){assert(connected,'download must run from a connected anchor');events.push('click');if(failClick)throw Error('blocked')},remove(){events.push('remove');connected=false}};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(tag){assert.equal(tag,'a');return link},body:{appendChild(node){assert.equal(node,link);if(failAppend)throw Error('unavailable body');connected=true;events.push('append')}}}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document});
 t.mock.method(URL,'createObjectURL',value=>{assert.equal(value,blob);if(failURL)throw Error('URL unavailable');events.push('create');return 'blob:nightjar-test'});
 t.mock.method(URL,'revokeObjectURL',url=>{assert.equal(url,'blob:nightjar-test');events.push('revoke')});
 t.mock.method(globalThis,'setTimeout',(callback,delay)=>{timers.push({callback,delay});return 0});
 return {events,timers,blob,link};
}
test('export stays synchronous, preserves file metadata and releases its URL after the browser starts reading',t=>{
 const b=browser(t);downloadFile(b.blob,'nightjar-mosaic.csv');
 assert.deepEqual(b.events,['create','append','click','remove']);
 assert.equal(b.link.download,'nightjar-mosaic.csv');assert.equal(b.link.href,'blob:nightjar-test');assert.equal(b.link.hidden,true);
 assert.equal(b.timers.length,1);assert.equal(b.timers[0].delay,60000);
 b.timers[0].callback();assert.equal(b.events.at(-1),'revoke');
});
test('a failed browser click releases the URL and temporary anchor and allows retry',t=>{
 const b=browser(t,{failClick:true});assert.throws(()=>downloadFile(b.blob,'plan.html'),/blocked/);
 assert.deepEqual(b.events,['create','append','click','revoke','remove']);assert.equal(b.timers.length,0);
 b.link.click=()=>b.events.push('retry click');downloadFile(b.blob,'plan.html');assert.equal(b.timers.length,1);
});
test('failure to attach an export still releases the URL without claiming a download',t=>{
 const b=browser(t,{failAppend:true});assert.throws(()=>downloadFile(b.blob,'backup.json'),/unavailable body/);
 assert.deepEqual(b.events,['create','revoke','remove']);assert.equal(b.timers.length,0);
});
test('URL creation failure propagates without clicking or scheduling unused cleanup',t=>{
 const b=browser(t,{failURL:true});assert.throws(()=>downloadFile(b.blob,'event.ics'),/URL unavailable/);
 assert.deepEqual(b.events,[]);assert.equal(b.timers.length,0);
});
