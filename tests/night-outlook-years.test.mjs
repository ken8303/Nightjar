import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {sevenNightOutlook}=await vite.ssrLoadModule('/lib/night-outlook.ts');
const {bodyPosition,A}=await vite.ssrLoadModule('/lib/sky.ts');
test('early observing years retain their actual year in night keys rather than becoming 1900s',()=>{
 for(const year of ['0001','0050','0099']){
  const start=Date.parse(`${year}-01-05T00:00Z`),hourly={time:Array.from({length:24},(_,i)=>(start+i*3600000)/1000),cloud_cover:Array(24).fill(20)},place={name:'Early year QA',latitude:51.5,longitude:0,timezone:'UTC'};
  const rows=sevenNightOutlook(hourly,place,new Date(start));assert(rows.length>0);assert(rows.every(row=>row.key.startsWith(year+'-')));
  assert(rows.some(row=>row.key===`${year}-01-04`));assert(rows.some(row=>row.key===`${year}-01-05`));
 }
});
test('the prior local night across UTC year one uses the BCE year rather than an AD/1900s key',()=>{
 const start=Date.parse('0001-01-01T00:00Z'),place={name:'Era boundary QA',latitude:51.5,longitude:0,timezone:'America/New_York'};
 const hourly={time:Array.from({length:6},(_,i)=>(start+i*3600000)/1000),cloud_cover:Array(6).fill(20)};
 assert(bodyPosition(A.Body.Sun,new Date(start),place).altitude<-18);
 const rows=sevenNightOutlook(hourly,place,new Date(start));assert(rows.length>0);assert(rows.some(row=>row.key==='0000-12-31'));assert(!rows.some(row=>row.key.startsWith('1901')));
});
