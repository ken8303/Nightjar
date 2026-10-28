import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {targetConstellation}=await vite.ssrLoadModule('/lib/target-constellation.ts');
const {A,observer}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.5,longitude:0},night=new Date('2026-10-27T00:00:00Z');
test('selected stars return known IAU constellations only during full darkness',()=>{
 assert.deepEqual(targetConstellation('Polaris',night,place),{name:'Ursa Minor',symbol:'UMi'});assert.deepEqual(targetConstellation('Sirius',night,place),{name:'Canis Major',symbol:'CMa'});assert.deepEqual(targetConstellation('Vega',night,place),{name:'Lyra',symbol:'Lyr'});
 assert.equal(targetConstellation('Polaris',new Date('2026-10-27T12:00:00Z'),place),null);assert.equal(targetConstellation('Unknown',night,place),null);assert.equal(targetConstellation('Moon',new Date(NaN),place),null);assert.equal(targetConstellation('Moon',night,{...place,latitude:91}),null);
});
test('moving targets use topocentric J2000 coordinates for each site and instant',()=>{
 for(const body of [A.Body.Moon,A.Body.Mars,A.Body.Jupiter])for(const day of [27,28]){const date=new Date(`2026-10-${day}T00:00:00Z`),eq=A.Equator(body,date,observer(place),false,true),expected=A.Constellation(eq.ra,eq.dec);assert.deepEqual(targetConstellation(String(body),date,place),{name:expected.name,symbol:expected.symbol})}
 assert.notDeepEqual(targetConstellation('Moon',night,place),targetConstellation('Moon',new Date('2026-10-30T00:00:00Z'),place),'the Moon moves between constellations');
});
