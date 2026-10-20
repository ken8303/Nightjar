import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {searchHorizonPasses:scan,findSatellitePasses:find}=await vite.ssrLoadModule('/lib/satellite-passes.ts');
const {parseOrbitElements:parse,parseOrbitalEpoch:epoch,satelliteEpochWindowMs:limit}=await vite.ssrLoadModule('/lib/satellite-elements.ts');
const {satelliteHorizontal,createSatelliteObserver}=await vite.ssrLoadModule('/lib/satellite-position.ts');
const [raw]=JSON.parse(await readFile(new URL('fixtures/iss-2026-10-19.json',import.meta.url),'utf8'));
const elements=parse(raw,25544),start=Date.parse('2026-10-19T12:00:00Z');
const close=(a,b,tolerance)=>assert(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);
const arc=(time,centre=60000,width=20000,height=30)=>({altitude:height*(1-((time-centre)/width)**2),azimuth:time/1000});

test('horizon roots and maximum are refined beyond the coarse sample grid',()=>{
 const [pass]=scan(t=>arc(t,65123),0,180000);assert(pass);close(pass.rise,45123,100);close(pass.peak,65123,100);close(pass.set,85123,100);close(pass.maximumAltitude,30,.001);assert(!pass.alreadyUp&&!pass.continues);close(pass.riseAzimuth,pass.rise/1000,1e-9);
});
test('a grazing pass entirely between negative samples is retained',()=>{
 const passes=scan(t=>arc(t,45000,3000,.2),0,120000);assert.equal(passes.length,1);close(passes[0].rise,42000,100);close(passes[0].peak,45000,100);close(passes[0].set,48000,100);close(passes[0].maximumAltitude,.2,.001);
 assert.deepEqual(scan(t=>({altitude:arc(t,45000,3000,.2).altitude-.21,azimuth:0}),0,120000),[]);
});
test('partial passes disclose clipped boundaries without inventing horizon events',()=>{
 const [up]=scan(t=>arc(t,0,20000),0,60000);assert(up.alreadyUp&&!up.continues);assert.equal(up.rise,0);assert.equal(up.peak,0);close(up.set,20000,100);
 const [later]=scan(t=>arc(t,60000,20000),0,60000);assert(!later.alreadyUp&&later.continues);assert.equal(later.set,60000);assert.equal(later.peak,60000);
 const [whole]=scan(()=>({altitude:10,azimuth:3}),0,60000);assert(whole.alreadyUp&&whole.continues);assert.equal(whole.rise,0);assert.equal(whole.set,60000);
});
test('distinct passes stay chronological and a continuous positive arc is not duplicated',()=>{
 const read=t=>({altitude:20*Math.cos((t-60000)*Math.PI/120000),azimuth:10});
 const passes=scan(read,0,420000);assert.equal(passes.length,2);close(passes[0].peak,60000,100);close(passes[1].peak,300000,100);assert(passes[0].set<passes[1].rise);
 const continuous=scan(t=>({altitude:20+2*Math.cos(t/10000),azimuth:0}),0,180000);assert.equal(continuous.length,1);assert(continuous[0].alreadyUp&&continuous[0].continues);
});
test('invalid windows and any failed propagation are unavailable rather than empty skies',()=>{
 for(const [a,b] of [[NaN,10],[0,0],[10,0],[0,86400001]])assert.throws(()=>scan(()=>({altitude:-1,azimuth:0}),a,b),/window/);
 assert.throws(()=>scan(t=>t===30000?null:{altitude:-1,azimuth:0},0,60000),/propagated/);
 assert.throws(()=>scan(()=>({altitude:Infinity,azimuth:0}),0,60000),/propagated/);
 assert.throws(()=>scan(t=>({altitude:-10+Math.cos(t*Math.PI/30000),azimuth:0}),0,86400000),/limit/);
});
test('ISS search is bounded to 24 hours and the source epoch, with explicit empty support errors',()=>{
 const ordinary=find(elements,start,51.5,-.1257);assert.equal(ordinary.end-start,86400000);assert.equal(ordinary.epochLimited,false);
 const edge=+epoch(raw.EPOCH)+limit;const partial=find(elements,edge-3600000,51.5,-.1257);assert.equal(partial.end,edge);assert.equal(partial.epochLimited,true);
 assert.throws(()=>find(elements,edge,51.5,0),/No supported/);assert.throws(()=>find(elements,edge+1,51.5,0),/three days/);assert.throws(()=>find(elements,start,91,0),/site/);assert.throws(()=>find({...elements,NORAD_CAT_ID:5},start,0,0),/ISS/);
 assert.deepEqual(find(elements,start,90,0).passes,[]);
 assert.deepEqual(find(elements,start,-17.75,180),find(elements,start,-17.75,-180));
});
test('reused propagators remain equivalent to fresh records across shuffled instants',()=>{
 const read=createSatelliteObserver(elements,51.5,-.1257);
 for(const offset of [3600000,0,-60000,86400000,12345])assert.deepEqual(read(start+offset),satelliteHorizontal(elements,new Date(start+offset),51.5,-.1257));
 assert.equal(read(+epoch(raw.EPOCH)+limit+1),null);
});
test('refined ISS passes agree with a separate one-second exhaustive search',()=>{
 // This verifies the search independently of its 30-second/peak-bracket method.
 // Both paths use the adapter whose TEME/WGS84 numbers have separate published
 // reference checks; this is not an independent SGP4 engine or real-sky test.
 for(const [lat,lon] of [[51.5,-.1257],[-33.87,151.21]]){
  const refined=find(elements,start,lat,lon).passes,read=createSatelliteObserver(elements,lat,lon),dense=[];let active=null;
  for(let time=start;time<=start+86400000;time+=1000){const point=read(time);assert(point);if(point.altitude>0){if(!active){active={rise:time,peak:time,set:time,maximumAltitude:point.altitude};dense.push(active)}active.set=time;if(point.altitude>active.maximumAltitude){active.peak=time;active.maximumAltitude=point.altitude}}else active=null}
  assert.equal(refined.length,dense.length);assert(refined.length>0);
  refined.forEach((pass,index)=>{const reference=dense[index];close(pass.rise,reference.rise,1100);close(pass.set,reference.set,1100);close(pass.peak,reference.peak,1100);close(pass.maximumAltitude,reference.maximumAltitude,.01)});
 }
});

test('high-latitude and date-line passes agree with an exhaustive two-second scan',()=>{
 // Additional observer geometry, including a southern latitude near the edge
 // of ISS coverage. The scan shares SGP4, but not the production search logic.
 for(const [lat,lon] of [[60,179.9],[-60,-179.9],[0,180],[67,0]]){
  const result=find(elements,start,lat,lon),read=createSatelliteObserver(elements,lat,lon),dense=[];let active=null;
  for(let time=start;time<=result.end;time+=2000){
   const point=read(time);assert(point);
   if(point.altitude>0){
    if(!active){active={rise:time,set:time,peak:time,maximumAltitude:point.altitude};dense.push(active)}
    active.set=time;
    if(point.altitude>active.maximumAltitude){active.peak=time;active.maximumAltitude=point.altitude}
   }else active=null;
  }
  assert.equal(result.passes.length,dense.length,`pass count at ${lat}, ${lon}`);
  result.passes.forEach((pass,index)=>{
   const reference=dense[index];close(pass.rise,reference.rise,2100);close(pass.set,reference.set,2100);close(pass.peak,reference.peak,2100);close(pass.maximumAltitude,reference.maximumAltitude,.03);
   assert(pass.rise<=pass.peak&&pass.peak<=pass.set);
   for(const window of pass.viewing??[])assert(window.start>=pass.rise&&window.end<=pass.set);
  });
 }
 for(const lat of [-90,90])assert.deepEqual(find(elements,start,lat,179.9).passes,[]);
});

test('a real pass clipped at either boundary keeps the correct in-window maximum',()=>{
 const read=createSatelliteObserver(elements,51.5,-.1257),full=find(elements,start,51.5,-.1257).passes[2];assert(full);
 const afterPeak=full.peak+30000,beforePeak=full.peak-30000;
 const [descending]=scan(read,afterPeak,full.set+60000);
 assert.equal(descending.alreadyUp,true);assert.equal(descending.continues,false);assert.equal(descending.rise,afterPeak);assert.equal(descending.peak,afterPeak);close(descending.set,full.set,200);
 const [ascending]=scan(read,full.rise-60000,beforePeak);
 assert.equal(ascending.alreadyUp,false);assert.equal(ascending.continues,true);assert.equal(ascending.set,beforePeak);assert.equal(ascending.peak,beforePeak);close(ascending.rise,full.rise,200);
 const [inside]=scan(read,beforePeak,afterPeak);
 assert.equal(inside.alreadyUp,true);assert.equal(inside.continues,true);assert.equal(inside.rise,beforePeak);assert.equal(inside.set,afterPeak);close(inside.peak,full.peak,200);close(inside.maximumAltitude,full.maximumAltitude,.001);
});
