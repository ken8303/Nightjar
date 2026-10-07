import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {stars,skyTargets,A,observer}=await vite.ssrLoadModule('/lib/sky.ts');
const {deepSkyPosition,messierCatalogue}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {objectPhoto}=await vite.ssrLoadModule('/lib/object-photos.ts');
const place={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'};
test('bright-star atlas and deep-sky catalogue interpret equal J2000 coordinates in the same date frame',()=>{
 for(const date of [new Date('2000-01-01T12:00Z'),new Date('2026-10-07T20:00Z'),new Date('2100-01-01T00:00Z')]){
  const targets=skyTargets(date,place);
  for(const [name,ra,dec] of stars){
   const actual=targets.find(target=>target.name===name),expected=deepSkyPosition({...messierCatalogue[0],ra,dec},date,place);
   assert(Math.abs(actual.altitude-expected.altitude)<1e-10,`${name} altitude uses another epoch`);assert(Math.abs(actual.azimuth-expected.azimuth)<1e-10);
  }
 }
});
test('the modern atlas corrects the fixed-equator shortcut without changing source photos or catalogue data',()=>{
 const date=new Date('2100-01-01T00:00Z'),before=structuredClone(stars),photo=objectPhoto('Vega').src;
 const [name,ra,dec]=stars.find(row=>row[0]==='Vega'),target=skyTargets(date,place).find(target=>target.name===name);
 const old=A.Horizon(date,observer(place),ra,dec,'normal');
 assert(Math.hypot(target.altitude-old.altitude,target.azimuth-old.azimuth)>.1,'date-frame correction must not collapse to the previous shortcut');
 assert.deepEqual(stars,before);assert.equal(objectPhoto('Vega').src,photo);assert.equal(new URL(photo).searchParams.get('e'),'J2000');
});
test('precessed bright-star and solar-system selections stay finite and within horizontal coordinate bounds',()=>{
 for(const latitude of [-90,0,90]){
  const targets=skyTargets(new Date('2026-10-07T20:00Z'),{...place,latitude});assert.equal(targets.length,42);
  for(const target of targets){assert(Number.isFinite(target.altitude)&&target.altitude>=-90&&target.altitude<=90);assert(Number.isFinite(target.azimuth)&&target.azimuth>=0&&target.azimuth<360)}
  assert.equal(targets.filter(target=>target.planet).length,8);
 }
});
