import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {fullDarknessPasses}=await vite.ssrLoadModule('/lib/satellite-night.ts');
const {A,observer,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.5,longitude:0};
function result(start){
 const rise=Date.parse(start),set=rise+600000,peak=rise+300000;
 return {start:rise,end:rise+86400000,epochLimited:false,passes:[{rise,peak,set,maximumAltitude:60,riseAzimuth:0,peakAzimuth:90,setAzimuth:180,alreadyUp:false,continues:false,lighting:null,viewing:[{start:rise+120000,end:set-120000,startsAtBoundary:false,endsAtBoundary:false}]}]};
}
test('night-only satellite display keeps dark contacts and source results unchanged',()=>{
 const source=result('2026-10-24T00:00Z'),before=structuredClone(source),filtered=fullDarknessPasses(source,place);
 assert.equal(filtered.passes.length,1);assert.deepEqual(source,before);assert.notEqual(filtered,source);
 assert.equal(filtered.start,source.start);assert.equal(filtered.end,source.end);
});
test('daylight and dawn-spanning passes cannot supply visible contacts or shortcuts',()=>{
 assert.deepEqual(fullDarknessPasses(result('2026-10-24T12:00Z'),place).passes,[]);
 const from=new Date('2026-10-24T00:00Z'),crossing=A.SearchAltitude(A.Body.Sun,observer(place),1,from,1,-18).date;
 const source=result(new Date(+crossing-300000).toISOString());
 assert(sunAltitude(new Date(source.passes[0].rise),place)<-18);
 assert(sunAltitude(new Date(source.passes[0].set),place)>-18);
 assert.deepEqual(fullDarknessPasses(source,place).passes,[]);
});
test('unsupported timestamps and windows outside the returned pass are not actionable',()=>{
 for(const mutate of [p=>p.peak=NaN,p=>p.peak=p.set+1,p=>p.rise=NaN,p=>p.set=p.rise-1,p=>p.set=p.rise+86400001,p=>p.viewing[0].start=p.rise-1,p=>p.viewing[0].end=p.set+1,p=>p.viewing[0].start=NaN]){
  const source=result('2026-10-24T00:00Z');mutate(source.passes[0]);assert.deepEqual(fullDarknessPasses(source,place).passes,[]);
 }
});
test('polar summer has no night passes, while fully dark polar winter retains them',()=>{
 const pole={name:'Pole',latitude:90,longitude:0};
 assert.deepEqual(fullDarknessPasses(result('2026-06-21T00:00Z'),pole).passes,[]);
 assert.equal(fullDarknessPasses(result('2026-12-21T00:00Z'),pole).passes.length,1);
});

test('a brief polar bright interval between thirty-second samples is excluded',()=>{
 const site={name:'Polar grazing fixture',latitude:84.56058967678678,longitude:0};
 const transit=A.SearchHourAngle(A.Body.Sun,observer(site),0,new Date('2026-12-21T00:00Z')).time.date;
 const source=result(new Date(+transit-15000).toISOString()),pass=source.passes[0];
 pass.set=+transit+15000;pass.peak=pass.rise;pass.viewing=[];
 assert(sunAltitude(new Date(pass.rise),site)<-18);assert(sunAltitude(new Date(pass.set),site)<-18);
 assert(sunAltitude(transit,site)>-18,'the Sun briefly exits darkness between the old sample points');
 assert.deepEqual(fullDarknessPasses(source,site).passes,[]);
});
