import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {filterDiary,diaryDateInput,emptyDiaryFilters}=await vite.ssrLoadModule('/lib/diary-filters.ts');
const first={id:'night-1',target:'M31',observedAt:'2026-10-05T23:30:00.000Z',place:{name:'Dark field',latitude:51,longitude:0,timezone:'Europe/London'},outcome:'seen',equipment:'10×50 binoculars',notes:'Faint oval glow\n星空'};
const second={...first,id:'night-2',target:'M45',observedAt:'2026-10-06T00:30:00.000Z',outcome:'not-seen',notes:'Cloud cover'},entries=[first,second];
test('diary search handles names, identifiers, multiline notes, Unicode and equipment while preserving source data',()=>{
 for(const query of ['Andromeda','M 31','M031','NGC0224','NGC 224','OVAL GLOW','星空'])assert.deepEqual(filterDiary(entries,{...emptyDiaryFilters,query}).entries,[first]);
 assert.equal(filterDiary(entries,{...emptyDiaryFilters,query:'BINOCULARS'}).entries.length,2);assert.equal(filterDiary(entries,{...emptyDiaryFilters,query:'pleiades'}).entries[0].id,'night-2');assert.equal(filterDiary(entries,{...emptyDiaryFilters,query:'<script>'}).entries.length,0);assert.deepEqual(entries,[first,second]);assert.deepEqual(filterDiary(entries,emptyDiaryFilters).entries,[second,first]);
});
test('inclusive UTC date filters distinguish site-local next-day observations and combine with results',()=>{
 assert.deepEqual(filterDiary(entries,{...emptyDiaryFilters,from:'2026-10-05',through:'2026-10-05'}).entries,[first]);
 assert.equal(filterDiary(entries,{...emptyDiaryFilters,from:'2026-10-05',through:'2026-10-06',outcome:'not-seen'}).entries[0].id,'night-2');
 assert.equal(filterDiary(entries,{...emptyDiaryFilters,from:'2026-10-07'}).entries.length,0);assert.equal(filterDiary(entries,{...emptyDiaryFilters,through:'2026-10-06'}).entries.length,2);
});
test('invalid calendar dates and reversed ranges report errors and return no downloadable entries',()=>{
 for(const patch of [{from:'2026-02-30'},{through:'bad'},{from:'2026-10-06',through:'2026-10-05'}]){const result=filterDiary(entries,{...emptyDiaryFilters,...patch});assert(result.error);assert.equal(result.entries.length,0)}
 assert.equal(filterDiary(entries,{...emptyDiaryFilters,from:'2024-02-29'}).error,'');assert.equal(filterDiary([],emptyDiaryFilters).entries.length,0);
});

test('mobile numeric date entry normalizes eight digits while keeping partial input editable',()=>{assert.equal(diaryDateInput('20261005'),'2026-10-05');assert.equal(diaryDateInput('2026-10-05'),'2026-10-05');assert.equal(diaryDateInput('202610'),'202610');assert.equal(diaryDateInput(''),'');assert(filterDiary(entries,{...emptyDiaryFilters,from:diaryDateInput('20260230')}).error)});


test('country search matches stored observing sites with Unicode normalization and preserves legacy records',()=>{
 const country={...first,place:{...first.place,country:'Ｕｎｉｔｅｄ Kingdom · 星空'}},before=structuredClone(country);
 for(const query of ['united kingdom','星空','Dark field'])assert.deepEqual(filterDiary([country,second],{...emptyDiaryFilters,query}).entries,query==='Dark field'?[second,country]:[country]);
 assert.deepEqual(country,before);assert.deepEqual(filterDiary([first,second],{...emptyDiaryFilters,query:'united kingdom'}).entries,[]);
});
