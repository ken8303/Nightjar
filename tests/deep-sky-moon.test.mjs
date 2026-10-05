import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {skySeparation,deepSkyMoon}=await vite.ssrLoadModule('/lib/deep-sky-moon.ts');
const {compareDeepSky,deepSkyOpportunity}=await vite.ssrLoadModule('/lib/deep-sky-comparison.ts');
const {findDeepSky,deepSkyPosition}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {A,bodyPosition,moonInfo}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'},date=new Date('2026-10-05T20:00Z');
test('angular separation handles wraparound, identical directions, opposite directions and zenith',()=>{
 assert(Math.abs(skySeparation({altitude:0,azimuth:359},{altitude:0,azimuth:1})-2)<1e-9);
 assert.equal(skySeparation({altitude:0,azimuth:0},{altitude:0,azimuth:0}),0);
 assert.equal(skySeparation({altitude:0,azimuth:0},{altitude:0,azimuth:180}),180);
 assert(Math.abs(skySeparation({altitude:90,azimuth:0},{altitude:0,azimuth:180})-90)<1e-9);
 for(let i=0;i<20;i++){const first={altitude:i*8-80,azimuth:i*17},second={altitude:40-i*3,azimuth:360-i*11};const expected=A.AngleBetween(A.VectorFromSphere(new A.Spherical(first.altitude,first.azimuth,1),date),A.VectorFromSphere(new A.Spherical(second.altitude,second.azimuth,1),date));assert(Math.abs(skySeparation(first,second)-expected)<1e-8)}
});
test('Moon context follows selected site and instant using the same apparent horizon model',()=>{
 const target=findDeepSky('M31','')[0];
 for(const instant of [date,new Date('2026-10-26T20:00Z')]){
  const context=deepSkyMoon(target,instant,place),moon=bodyPosition(A.Body.Moon,instant,place),info=moonInfo(instant,place);
  assert.equal(context.altitude,moon.altitude);assert.equal(context.illumination,A.Illumination(A.Body.Moon,instant).phase_fraction);assert.equal(context.name,info.name);assert.equal(context.belowHorizon,moon.altitude<=0);assert.equal(context.separation,skySeparation(deepSkyPosition(target,instant,place),moon));assert(context.separation>=0&&context.separation<=180);
 }
});
test('Moon-down filtering excludes bright-Moon samples without weakening darkness and altitude thresholds',()=>{
 const target=findDeepSky('M31','')[0],start=new Date('2026-10-26T20:00Z'),normal=compareDeepSky([target],start,place)[0],filtered=compareDeepSky([target],start,place,true)[0];
 assert(normal.best);assert(filtered.minutes<=normal.minutes);if(filtered.best){assert(filtered.moonAtBest.belowHorizon);assert(filtered.best.altitude>30&&filtered.best.sun<=-18)}
 const sample=(index,moonAltitude)=>({time:new Date(+date+index*900000),sun:-18,altitude:60,azimuth:0,ra:0,dec:0,moonAltitude});
 const samples=[sample(0,-1),sample(1,0),sample(2,.01),sample(3,-1)];
 assert.equal(deepSkyOpportunity(samples,true).minutes,15);assert.equal(deepSkyOpportunity(samples).minutes,45);
 assert.equal(deepSkyOpportunity([sample(0,.01)],true).best,null);assert.equal(deepSkyOpportunity([sample(0,undefined)],true).best,null);
 assert.equal(deepSkyOpportunity([{...sample(0,-1),altitude:30}],true).best,null);assert.equal(deepSkyOpportunity([{...sample(0,-1),sun:-17.99}],true).best,null);
});
