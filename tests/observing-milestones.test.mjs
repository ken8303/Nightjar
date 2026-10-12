import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {observingMilestones,A,observer}=await vite.ssrLoadModule('/lib/sky.ts');
const {validObservingDate}=await vite.ssrLoadModule('/lib/observing-time.ts');
const place={name:'London QA',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'};
test('milestones never publish crossings beyond the supported observing calendar',()=>{
 const date=new Date('9999-12-31T23:59:59.999Z'),rows=observingMilestones(date,place);
 assert.equal(rows.length,6);assert(rows.every(row=>row.date===null));
 for(const invalid of [new Date(NaN),new Date('0000-01-01T00:00Z'),new Date('+010000-01-01T00:00Z')])assert.throws(()=>observingMilestones(invalid,place),/UTC years 1–9999/);
});
test('ordinary milestones retain exact provider crossings and bounded polar empty states',()=>{
 const date=new Date('2026-10-12T20:00Z'),obs=observer(place),rows=observingMilestones(date,place);
 const expected=[A.SearchRiseSet(A.Body.Sun,obs,-1,date,2),A.SearchAltitude(A.Body.Sun,obs,-1,date,2,-18),A.SearchAltitude(A.Body.Sun,obs,1,date,2,-18),A.SearchRiseSet(A.Body.Sun,obs,1,date,2),A.SearchRiseSet(A.Body.Moon,obs,1,date,2),A.SearchRiseSet(A.Body.Moon,obs,-1,date,2)];
 rows.forEach((row,index)=>{assert.equal(row.date?.getTime()??null,expected[index]?.date.getTime()??null);if(row.date){assert(validObservingDate(row.date));assert(+row.date>=+date&&+row.date<=+date+48*3600000)}});
 const polar=observingMilestones(new Date('2026-06-21T12:00Z'),{...place,latitude:89});
 assert(polar.slice(0,4).every(row=>row.date===null));
});
