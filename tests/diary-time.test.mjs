import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {diaryLocalTime,diaryUtcTime}=await vite.ssrLoadModule('/lib/diary-time.ts');
const {diaryReport,diaryCSV}=await vite.ssrLoadModule('/lib/diary-export.ts');
const entry={id:'record-1',target:'M31',observedAt:'2026-10-25T00:30:00.000Z',place:{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},outcome:'seen',equipment:'',notes:''};
test('diary local labels distinguish repeated hours and preserve fractional instants in UI/report/CSV',()=>{
 const first=diaryLocalTime(entry),later={...entry,id:'record-2',observedAt:'2026-10-25T01:30:59.987Z'},second=diaryLocalTime(later),before=structuredClone(later);
 assert(first.includes('01:30:00 GMT+1'));assert(second.includes('01:30:59.987 GMT'));assert.notEqual(first,second);
 assert.equal(diaryUtcTime(later.observedAt),'2026-10-25 01:30:59.987 UTC');assert.equal(diaryUtcTime(entry.observedAt),'2026-10-25 00:30 UTC');
 assert(diaryCSV([later]).includes(second));assert(diaryReport([later]).includes(second));assert(diaryReport([later]).includes(later.observedAt));assert.deepEqual(later,before);
});
test('local labels include historical second offsets and era at the UTC-year boundary without changing source instants',()=>{
 const historical={...entry,observedAt:'1899-01-01T11:50:39.000Z',place:{...entry.place,timezone:'Europe/Paris'}};
 assert(diaryLocalTime(historical).includes('12:00:00 GMT+0:09:21'));assert.equal(diaryUtcTime(historical.observedAt),'1899-01-01 11:50:39 UTC');
 assert(diaryLocalTime({...entry,observedAt:'0001-01-01T00:00:00.000Z',place:{...entry.place,timezone:'America/New_York'}}).includes('BC'));
 assert(diaryLocalTime({...entry,place:{...entry.place,timezone:undefined}}).includes('00:30:00 GMT'));
});
