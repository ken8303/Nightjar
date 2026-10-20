import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {intersectTimeWindows:intersect,modelledViewingWindows:model,findSatellitePasses:find}=await vite.ssrLoadModule('/lib/satellite-passes.ts');
const {satelliteLighting}=await vite.ssrLoadModule('/lib/satellite-lighting.ts');
const {createSatelliteObserver}=await vite.ssrLoadModule('/lib/satellite-position.ts');
const {parseOrbitElements:parse}=await vite.ssrLoadModule('/lib/satellite-elements.ts');
const [raw]=JSON.parse(await readFile(new URL('fixtures/iss-2026-10-19.json',import.meta.url),'utf8'));
const elements=parse(raw),start=Date.parse('2026-10-19T12:00:00Z');
const close=(a,b,tolerance=110)=>assert(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);
const conditions=(time,end=120000)=>({altitude:45-15*((time-90000)/60000)**2,sunAltitude:-6-(time-60000)/10000,sunClearance:(end-time)/60000});

test('separately refined altitude, twilight and shadow intervals yield their common overlap',()=>{
 const windows=model(conditions,0,180000);assert.equal(windows.length,1);close(windows[0].start,60000);close(windows[0].end,120000);
 assert.deepEqual(model(time=>({...conditions(time),sunAltitude:10}),0,180000),[]);
 assert.deepEqual(model(time=>({...conditions(time),sunClearance:-1}),0,180000),[]);
});
test('a useful between-sample overlap is retained, while an explicitly too-short overlap is omitted',()=>{
 const read=(time,end)=>({altitude:45-15*((time-60123)/15000)**2,sunAltitude:-6-(time-60000)/10000,sunClearance:(end-time)/60000});
 // At 0, 30, 60, 90... seconds the combined strict predicate is never true.
 for(let time=0;time<=120000;time+=30000){const p=read(time,71000);assert(!(p.altitude>30&&p.sunAltitude< -6&&p.sunClearance>0))}
 const [window]=model(time=>read(time,71000),0,120000);assert(window);close(window.start,60000);close(window.end,71000);
 assert.deepEqual(model(time=>read(time,69000),0,120000),[]);
});
test('window intersection preserves disjoint segments, does not mutate inputs and validates bounds',()=>{
 const groups=[[{start:0,end:50000},{start:60000,end:100000}],[{start:20000,end:80000}],[{start:25000,end:90000}]],original=structuredClone(groups);
 assert.deepEqual(intersect(groups),[{start:25000,end:50000},{start:60000,end:80000}]);assert.deepEqual(groups,original);
 assert.deepEqual(intersect([groups[0],[]]),[]);assert.deepEqual(intersect([[{start:0,end:10000}],[{start:10000,end:20000}]]),[]);
 assert.throws(()=>intersect([[{start:NaN,end:1}]]));assert.throws(()=>intersect([[{start:10,end:0}]]));assert.throws(()=>intersect([],NaN));
});
test('a failed criterion or exhausted calculation is unavailable rather than an empty window claim',()=>{
 assert.equal(model(time=>time===30000?null:conditions(time),0,180000),null);
 assert.equal(model(time=>({...conditions(time),sunClearance:NaN}),0,180000),null);
 assert.equal(model(conditions,0,86400001),null);
 assert.equal(model(time=>({altitude:31+Math.cos(time*Math.PI/30000),sunAltitude:-20,sunClearance:1}),0,86400000),null);
 const full=model(()=>({altitude:50,sunAltitude:-20,sunClearance:1}),10000,70000);assert.deepEqual(full,[{start:10000,end:70000}]);
});
test('solar-disc clearance has the same sunlit boundary as the independently checked shadow model',()=>{
 for(let offset=0;offset<3*3600000;offset+=30000){const light=satelliteLighting(elements,new Date(start+offset),51.5,-.1257);assert(light);assert.equal(light.sunClearance>=0,light.shadow===0)}
});
test('real modelled windows agree with a separate one-second combined-condition scan',()=>{
 // Independent search topology; the same separately checked SGP4 and shadow
 // models supply numbers. This does not establish real-sky accuracy/visibility.
 for(const [lat,lon,expectedCount] of [[51.5,-.1257,1],[-33.87,151.21,0],[45,135,1]]){
  const result=find(elements,start,lat,lon),read=createSatelliteObserver(elements,lat,lon);let count=0;
  for(const pass of result.passes){
   assert.notEqual(pass.viewing,null);const dense=[];let active=null;
   for(let time=Math.ceil(pass.rise/1000)*1000;time<=pass.set;time+=1000){
    const p=read(time),light=satelliteLighting(elements,new Date(time),lat,lon);assert(p&&light);
    if(p.altitude>30&&light.sunAltitude< -6&&light.shadow===0){if(!active){active={start:time,end:time};dense.push(active)}active.end=time}else active=null;
   }
   const retained=dense.filter(window=>window.end-window.start>=10000);assert.equal(pass.viewing.length,retained.length);count+=retained.length;
   pass.viewing.forEach((window,index)=>{
    close(window.start,retained[index].start,1100);close(window.end,retained[index].end,1100);assert(window.start>=pass.rise&&window.end<=pass.set);assert(window.end-window.start>=10000);
    // The planning shortcut selects this interior instant, not the pass peak:
    // check its actual model conditions, including a shadow-exit-limited arc.
    const midpoint=Math.floor(window.start+(window.end-window.start)/2),direction=read(midpoint),light=satelliteLighting(elements,new Date(midpoint),lat,lon);
    assert(direction.altitude>30);assert(light.sunAltitude< -6);assert.equal(light.shadow,0);
   });
  }
  assert.equal(count,expectedCount);
  if(lat===45){const window=result.passes.flatMap(pass=>pass.viewing)[0];assert(read(window.start-1000).altitude>30);assert(satelliteLighting(elements,new Date(window.start-1000),lat,lon).shadow>0);assert.equal(satelliteLighting(elements,new Date(window.start+1000),lat,lon).shadow,0)}
 }
});
test('a selected-time boundary is disclosed without inventing an earlier observing window',()=>{
 const result=find(elements,Date.parse('2026-10-20T05:20:52.474Z'),51.5,-.1257),window=result.passes[0].viewing[0];assert(window);assert.equal(window.start,result.start);assert.equal(window.startsAtBoundary,true);assert.equal(window.endsAtBoundary,false);
});
test('unsupported lighting dates keep valid geometric passes with unavailable viewing calculations',()=>{
 const future=Date.parse('2051-01-01T12:00:00Z'),result=find(parse({...raw,EPOCH:new Date(future).toISOString()}),future,51.5,0);assert(result.passes.length>0);const high=result.passes.filter(pass=>pass.maximumAltitude>30);assert(high.length>0);assert(high.every(pass=>pass.viewing===null&&pass.lighting===null));
});

test('the live summary announces matching windows separately from unavailable calculations',async()=>{
 const {satellitePassSummary:summary}=await vite.ssrLoadModule('/lib/satellite-pass-summary.ts');
 assert.equal(summary({passes:[]}),'0 geometric passes found in this search window. 0 modelled observing windows match the criteria.');
 assert.equal(summary({passes:[{viewing:[]},{viewing:[{start:0,end:10000}]}]}),'2 geometric passes found in this search window. 1 modelled observing window matches the criteria.');
 assert.equal(summary({passes:[{viewing:null}]}),'1 geometric pass found in this search window. 0 modelled observing windows match the criteria. Window calculations are unavailable for 1 pass.');
});
