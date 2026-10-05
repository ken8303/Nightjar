import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {messierCatalogue,findDeepSky,deepSkyPosition,bestDeepSkyTime}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {A,bodyPosition}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'};
test('Messier search handles common names, spaced identifiers and object-type filters',()=>{
 assert.equal(messierCatalogue.length,109);assert.equal(new Set(messierCatalogue.map(t=>t.id)).size,109);
 assert.equal(findDeepSky('M 31','')[0].name,'Andromeda Galaxy');
 assert.equal(findDeepSky('NGC 224','')[0].id,'M31');
 assert.equal(findDeepSky('NGC 0224','')[0].id,'M31');
 assert.equal(findDeepSky('pleiades','')[0].id,'M45');
 assert.equal(findDeepSky('andromeda','Open cluster').length,0);
 for(const t of messierCatalogue){assert(t.ra>=0&&t.ra<24);assert(Math.abs(t.dec)<=90);assert(t.major===null||t.major>0)}
});
test('J2000 positions are precessed to the selected epoch before horizon conversion',()=>{
 const t=findDeepSky('M31','')[0],date=new Date('2050-01-01T20:00:00Z');
 A.DefineStar(A.Body.Star1,t.ra,t.dec,1000);
 const eq=A.Equator(A.Body.Star1,date,new A.Observer(place.latitude,place.longitude,0),true,false);
 const expected=A.Horizon(date,new A.Observer(place.latitude,place.longitude,0),eq.ra,eq.dec,'normal');
 const position=deepSkyPosition(t,date,place);
 assert(Math.abs(position.altitude-expected.altitude)<.001);assert(Math.abs(position.azimuth-expected.azimuth)<.001);
});
test('best-time recommendation honours darkness, strict altitude threshold and highest sampled position',()=>{
 const target=findDeepSky('M31','')[0],date=new Date('2026-10-05T20:00:00Z'),best=bestDeepSkyTime(target,date,place);
 assert(best);assert(best.altitude>30);assert(bodyPosition(A.Body.Sun,best.date,place).altitude<=-18);
 assert(+best.date>=+date&&+best.date<=+date+86400000);
 for(let m=0;m<=1440;m+=15){const d=new Date(+date+m*60000);if(bodyPosition(A.Body.Sun,d,place).altitude<=-18)assert(deepSkyPosition(target,d,place).altitude<=best.altitude+1e-9)}
 assert.equal(bestDeepSkyTime(target,new Date('2026-06-21T12:00:00Z'),{name:'North pole',latitude:89,longitude:0}),null);
});
