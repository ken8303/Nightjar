import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {observingTextList}=await vite.ssrLoadModule('/lib/observing-text-list.ts');
const {localizedDarknessDuration}=await vite.ssrLoadModule('/lib/darkness-duration-language.ts');
const {darknessSummaryLines}=await vite.ssrLoadModule('/lib/darkness-remaining.ts');
const input={date:new Date('2026-10-27T00:00:00Z'),place:{name:'London',latitude:51.5,longitude:0,timezone:'UTC'},targets:[{name:'Vega',altitude:16.2,azimuth:313}],notes:{Vega:'Personal 星空 {name}'},targetsOmitted:2,notesUnavailable:true,notesUnsaved:true};
test('plain-text observing lists preserve English data and localized coverage warnings',()=>{
 const before=structuredClone(input),en=observingTextList(input),zh=observingTextList({...input,language:'zh-Hant'});
 for(const line of darknessSummaryLines(input.date,input.place))assert(en.includes(line));assert(en.includes('[ ] Vega'));assert(en.includes('Personal 星空 {name}'));assert(en.includes('omits 2 older saved names'));assert(en.includes('includes unsaved note edits'));
 assert(zh.includes('NIGHTJAR — 觀測清單'));assert(zh.includes('[ ] 織女星 (Vega)'));assert(zh.includes('Personal 星空 {name}'));assert(zh.includes('省略 2 個較早儲存的名稱'));assert(zh.includes('未儲存的筆記編輯'));assert(zh.includes(input.date.toISOString()));assert.deepEqual(input,before);
});
test('localized darkness durations preserve short and exact minute values',()=>{
 const start=new Date('2026-10-27T00:00:00Z');assert.equal(localizedDarknessDuration(start,new Date(+start+59000),'zh-Hant'),'少於一分鐘');assert.equal(localizedDarknessDuration(start,new Date(+start+3660000),'zh-Hant'),'1 小時1 分鐘');assert.equal(localizedDarknessDuration(start,new Date(+start+3660000),'en'),'1 hour 1 minute');assert.throws(()=>localizedDarknessDuration(start,new Date(+start-1),'zh-Hant'));
});
