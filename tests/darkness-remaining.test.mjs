import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {remainingDarkness,darknessDuration}=await vite.ssrLoadModule('/lib/darkness-remaining.ts');
const {sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
const london={name:'London',latitude:51.5,longitude:0};
test('remaining darkness ends at the first ascending astronomical twilight crossing',()=>{
 const start=new Date('2026-10-25T00:00Z'),before=+start,window=remainingDarkness(start,london);
 assert(window?.end);assert(+window.end>+start);assert(+window.end-+start<12*3600000);
 assert(sunAltitude(new Date(+window.end-2000),london)<-18);
 assert(sunAltitude(new Date(+window.end+2000),london)>-18);
 assert.equal(+start,before);assert.notEqual(window.start,start);assert.equal(window.dateLimited,false);
});
test('daylight, twilight and invalid observing times do not acquire a dark duration',()=>{
 for(const date of [new Date('2026-10-24T12:00Z'),new Date('2026-10-24T18:00Z'),new Date(NaN),new Date('+010000-01-01T00:00Z')])assert.equal(remainingDarkness(date,london),null);
});
test('polar winter distinguishes an unlocated end from a zero-length night',()=>{
 const start=new Date('2026-12-21T12:00Z'),window=remainingDarkness(start,{name:'North Pole',latitude:90,longitude:0});
 assert(window);assert.equal(window.end,null);assert.equal(+window.searchEnd-+start,48*3600000);assert.equal(window.dateLimited,false);
});
test('darkness duration uses elapsed UTC time through both UK clock changes',()=>{
 assert.equal(darknessDuration(new Date('2026-10-25T00:30Z'),new Date('2026-10-25T01:30Z')),'1 hour');
 assert.equal(darknessDuration(new Date('2026-03-29T00:30Z'),new Date('2026-03-29T01:30Z')),'1 hour');
 assert.equal(darknessDuration(new Date('2026-10-24T23:30Z'),new Date('2026-10-25T02:45Z')),'3 hours 15 minutes');
 assert.equal(darknessDuration(new Date('2026-10-25T00:00Z'),new Date('2026-10-25T00:00:59Z')),'Less than a minute');
 assert.equal(darknessDuration(new Date('2026-10-25T00:00Z'),new Date('2026-10-25T00:01Z')),'1 minute');
 assert.throws(()=>darknessDuration(new Date('2026-10-25T01:00Z'),new Date('2026-10-25T00:00Z')),/Invalid/);
});
test('searches stop at the supported date boundary',()=>{
 const start=new Date('9999-12-31T23:59:59.999Z');
 const place=[london,{...london,longitude:180}].find(site=>sunAltitude(start,site)<-18);assert(place);
 const window=remainingDarkness(start,place);assert(window);assert.equal(window.end,null);assert.equal(+window.searchEnd,+start);assert.equal(window.dateLimited,true);
});
