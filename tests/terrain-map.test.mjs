import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {terrainSamplePoints,calculateTerrainHorizon}=await vite.ssrLoadModule('/lib/terrain-horizon.ts');
const {GET:terrain}=await vite.ssrLoadModule('/app/api/terrain-horizon/route.ts');
const {GET:clouds}=await vite.ssrLoadModule('/app/api/map-clouds/route.ts');
test('terrain sampling wraps longitudes and flat or raised terrain produces bounded horizons',()=>{
 const points=terrainSamplePoints(51.5,179.99);assert.equal(points.length,65);assert(points.every(p=>Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180));assert(points.some(p=>p.longitude<0));
 assert.deepEqual(calculateTerrainHorizon(Array(65).fill(100)),Array(8).fill(0));
 const ridge=Array(65).fill(100);ridge[1]=200;const result=calculateTerrainHorizon(ridge);assert(result[0]>20);assert.deepEqual(result.slice(1),Array(7).fill(0));
 assert.throws(()=>calculateTerrainHorizon([1,null]));assert.throws(()=>terrainSamplePoints(91,0));
});
test('terrain directions remain distinct at both poles and follow the selected meridian',()=>{
 const wrap=degrees=>((degrees+540)%360)-180;
 for(const [latitude,longitude] of [[90,23],[-90,-170]]){
  const points=terrainSamplePoints(latitude,longitude);
  for(let direction=0;direction<8;direction++)for(let step=0;step<8;step++){
   const point=points[1+direction*8+step],expected=wrap(longitude+(latitude>0?180-direction*45:direction*45));
   assert(Math.abs(wrap(point.longitude-expected))<1e-6,`latitude ${latitude}, direction ${direction}, step ${step}`);
   assert(Math.abs(point.latitude)<90);
  }
 }
});
test('terrain samples preserve distances and bearings near the date line',()=>{
 const latitude=51.5,longitude=179.99,points=terrainSamplePoints(latitude,longitude),radians=Math.PI/180,distances=[250,500,1000,2000,5000,10000,20000,40000];
 for(let direction=0;direction<8;direction++)for(let step=0;step<8;step++){
  const point=points[1+direction*8+step],lat1=latitude*radians,lat2=point.latitude*radians,dlon=(point.longitude-longitude)*radians;
  const a=Math.sin((lat2-lat1)/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  const distance=2*6371000*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  const bearing=(Math.atan2(Math.sin(dlon)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dlon))/radians+360)%360;
  assert(Math.abs(distance-distances[step])<0.001);assert(Math.abs(((bearing-direction*45+540)%360)-180)<1e-7);
 }
});
test('terrain endpoint validates sites and refuses missing elevations',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async(url)=>{calls++;assert.equal(new URL(url).searchParams.get('latitude').split(',').length,65);return Response.json({elevation:Array(65).fill(4)})};
 assert.equal((await terrain(new Request('https://example.test/api?lat=91&lon=0'))).status,400);assert.equal(calls,0);
 const response=await terrain(new Request('https://example.test/api?lat=51.5&lon=0'));assert.equal(response.status,200);assert.deepEqual((await response.json()).heights,Array(8).fill(0));
 globalThis.fetch=async()=>Response.json({elevation:[null]});assert.equal((await terrain(new Request('https://example.test/api?lat=51.6&lon=0'))).status,502);
 }finally{globalThis.fetch=original}
});
test('cloud map never requests or returns daytime points and preserves unknown forecasts',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(url)=>{calls++;const u=new URL(url),lat=u.searchParams.get('latitude').split(','),start=Date.parse('2026-10-27T00:00:00Z')/1000;return Response.json(lat.map(()=>({hourly:{time:[start,start+3600],cloud_cover:[null,40]}})))};
  const base='https://example.test/api?south=51&north=52&west=-1&east=1&time=';
  let response=await clouds(new Request(base+Date.parse('2026-10-27T12:00:00Z')));assert.equal(response.status,200);assert.deepEqual((await response.json()).sites,[]);assert.equal(calls,0);
  response=await clouds(new Request(base+Date.parse('2026-10-27T00:00:00Z')));assert.equal(response.status,200);const result=await response.json();assert.equal(result.sites.length,25);assert(result.sites.every(site=>site.cloud===null));assert.equal(calls,1);
  assert.equal((await clouds(new Request('https://example.test/api?south=-90&north=1&west=-1&east=1&time=0'))).status,400);
 }finally{globalThis.fetch=original}
});
