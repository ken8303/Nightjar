import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {readDeepSkyList,saveDeepSkyList,validDeepSkyList}=await vite.ssrLoadModule('/lib/deep-sky-list.ts');
const {messierCatalogue,deepSkyPosition}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {printableObservingPlan}=await vite.ssrLoadModule('/lib/observing-plan.ts');
test('deep-sky lists deduplicate known IDs and report corrupt or blocked storage',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 assert.deepEqual(readDeepSkyList(storage),[]);saveDeepSkyList(['M31','M45','M31'],storage);assert.deepEqual(readDeepSkyList(storage),['M31','M45']);
 assert(validDeepSkyList(messierCatalogue.map(t=>t.id)));
 assert.throws(()=>saveDeepSkyList(['M102'],storage));assert.throws(()=>readDeepSkyList({getItem:()=>'{'}));assert.throws(()=>readDeepSkyList({getItem:()=>{throw Error('blocked')}}));assert.throws(()=>saveDeepSkyList(['M31'],{setItem:()=>{throw Error('quota')}}));
});
test('offline print plans can include the complete deep-sky list with source attribution',()=>{
 const date=new Date('2026-10-05T20:00:00Z'),place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'};
 const targets=messierCatalogue.map(target=>({name:target.id,...deepSkyPosition(target,date,place)}));
 const html=printableObservingPlan({date,place,targets,notes:{},equipment:[],catalogueNotice:'OpenNGC · CC BY-SA 4.0 <source>'});
 assert.equal([...html.matchAll(/type="checkbox"/g)].length,109);assert(html.includes('CC BY-SA 4.0 &lt;source&gt;'));assert(!/<[^>]+\b(?:src|href)\s*=/i.test(html));assert(html.includes('2026-10-05 20:00 UTC'));
});
