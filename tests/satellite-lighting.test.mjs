import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as A from 'astronomy-engine';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {orbitalShadow,satelliteLighting}=await vite.ssrLoadModule('/lib/satellite-lighting.ts');
const {parseOrbitElements:parse}=await vite.ssrLoadModule('/lib/satellite-elements.ts');
const {findSatellitePasses:find}=await vite.ssrLoadModule('/lib/satellite-passes.ts');
const [raw]=JSON.parse(await readFile(new URL('fixtures/iss-2026-10-19.json',import.meta.url),'utf8'));
const sun={x:1,y:0,z:0},earthAngle=Math.asin(6378.135/7000),sunAngle=Math.asin(695700/149597870.69098932);
const position=angle=>({x:-7000*Math.cos(angle),y:7000*Math.sin(angle),z:0});
// Independent area quadrature of the documented apparent-disc approximation,
// rather than another call to the library's circle-intersection formula.
function discCoverage(separation){let covered=0;const rings=192,sectors=384;for(let ring=0;ring<rings;ring++){const radius=sunAngle*Math.sqrt((ring+.5)/rings);for(let sector=0;sector<sectors;sector++){const angle=2*Math.PI*(sector+.5)/sectors;if(Math.hypot(separation+radius*Math.cos(angle),radius*Math.sin(angle))<earthAngle)covered++}}return covered/(rings*sectors)}

test('Sun-side, umbra and penumbra match independent apparent-disc area quadrature',()=>{
 assert.deepEqual(orbitalShadow(sun,{x:7000,y:0,z:0}),{shadow:0,sunlight:'sunlit'});assert.deepEqual(orbitalShadow(sun,position(0)),{shadow:1,sunlight:'earth-shadow'});
 let previous=1;
 for(const offset of [-1.2,-.5,0,.5,1.2]){const separation=earthAngle+offset*sunAngle,result=orbitalShadow(sun,position(separation));assert(result);assert(Math.abs(result.shadow-discCoverage(separation))<.002);assert(result.shadow<=previous);previous=result.shadow;if(Math.abs(offset)<1)assert.equal(result.sunlight,'partial-shadow')}
});
test('invalid geometry and unsupported Sun-model dates remain unavailable',()=>{
 for(const point of [{x:0,y:0,z:0},{x:6378,y:0,z:0},{x:NaN,y:7000,z:0}])assert.equal(orbitalShadow(sun,point),null);
 for(const solar of [{x:0,y:0,z:0},{x:Infinity,y:0,z:0},{x:1e8,y:0,z:0}])assert.equal(orbitalShadow(solar,position(0)),null);
 const elements=parse(raw),date=new Date('2026-10-19T12:00:00Z');
 for(const [lat,lon] of [[NaN,0],[91,0],[0,181]])assert.equal(satelliteLighting(elements,date,lat,lon),null);
 assert.equal(satelliteLighting(elements,new Date(NaN),0,0),null);assert.equal(satelliteLighting(elements,new Date('2030-01-01T00:00:00Z'),0,0),null);
 const future=new Date('2051-01-01T00:00:00Z');assert.equal(satelliteLighting(parse({...raw,EPOCH:future.toISOString()}),future,0,0),null);
});
test('geometric Sun altitude agrees with independent Astronomy Engine across dates, poles and the longitude seam',()=>{
 let largest=0;
 for(const text of ['2000-03-20T12:00:00Z','2026-06-21T00:00:00Z','2026-10-19T12:00:00Z','2050-12-21T12:00:00Z']){
  const date=new Date(text),elements=parse({...raw,EPOCH:date.toISOString()});
  for(const lat of [-90,-33.87,0,51.5,90])for(const lon of [-180,0,151.21,180]){
   const light=satelliteLighting(elements,date,lat,lon);assert(light);const observer=new A.Observer(lat,lon,0),equator=A.Equator(A.Body.Sun,date,observer,true,true),reference=A.Horizon(date,observer,equator.ra,equator.dec).altitude;
   largest=Math.max(largest,Math.abs(reference-light.sunAltitude));assert(Math.abs(reference-light.sunAltitude)<.02);
  }
  assert.deepEqual(satelliteLighting(elements,date,0,180),satelliteLighting(elements,date,0,-180));
 }
 assert(largest>0); // Separate algorithms, not an accidentally shared result.
});
test('pass peaks distinguish a dark shadowed ISS, a sunlit twilight ISS and a daylight ISS',()=>{
 const result=find(parse(raw),Date.parse('2026-10-19T12:00:00Z'),51.5,-.1257);assert.equal(result.passes.length,6);
 const [night,,twilight,day]=result.passes.map(pass=>pass.lighting);assert.equal(night.sunlight,'earth-shadow');assert(night.sunAltitude< -18);assert.equal(twilight.sunlight,'sunlit');assert(twilight.sunAltitude< -6&&twilight.sunAltitude> -12);assert.equal(day.sunlight,'sunlit');assert(day.sunAltitude>0);
 for(const pass of result.passes)assert.deepEqual(pass.lighting,satelliteLighting(parse(raw),new Date(pass.peak),51.5,-.1257));
});
