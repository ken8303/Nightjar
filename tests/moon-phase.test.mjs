import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {moonPhaseName}=await vite.ssrLoadModule('/lib/moon-phase.ts');
const {moonInfo,A}=await vite.ssrLoadModule('/lib/sky.ts');
const {deepSkyMoon}=await vite.ssrLoadModule('/lib/deep-sky-moon.ts');
const {messierCatalogue}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
test('eight phase ranges have correct centres and the new-moon label wraps across zero',()=>{
 const names=['New Moon','Waxing crescent','First quarter','Waxing gibbous','Full Moon','Waning gibbous','Last quarter','Waning crescent'];
 names.forEach((name,index)=>assert.equal(moonPhaseName(index*45),name));
 for(const phase of [0,22.499,337.5,359.999,360,720,-.001])assert.equal(moonPhaseName(phase),'New Moon');
 assert.equal(moonPhaseName(337.499),'Waning crescent');assert.equal(moonPhaseName(22.5),'Waxing crescent');
 for(const value of [NaN,Infinity,-Infinity])assert.throws(()=>moonPhaseName(value),/finite/);
});
test('a real new-moon crossing retains the correct label before and after longitude wraps',()=>{
 const crossing=A.SearchMoonPhase(0,new Date('2026-10-01T00:00Z'),30);assert(crossing);
 const before=moonInfo(new Date(+crossing.date-12*3600000),place),after=moonInfo(new Date(+crossing.date+12*3600000),place);
 assert(before.phase>337.5);assert(after.phase<22.5);assert.equal(before.name,'New Moon');assert.equal(after.name,'New Moon');
 assert(before.illumination<.01);assert(after.illumination<.01);
});
test('Moon dashboard and deep-sky planning share the same illumination throughout a lunation',()=>{
 const target=messierCatalogue.find(target=>target.id==='M31');
 for(let day=1;day<=30;day++){
  const date=new Date(Date.UTC(2026,9,day,20)),info=moonInfo(date,place),context=deepSkyMoon(target,date,place);
  assert.equal(info.illumination,context.illumination);assert(info.illumination>=0&&info.illumination<=1);assert.equal(info.name,context.name);
 }
});
