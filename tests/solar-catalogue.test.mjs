import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {skyTargets,skyBodies,bodyPosition,A}=await vite.ssrLoadModule('/lib/sky.ts');
const {layoutCameraLabels}=await vite.ssrLoadModule('/lib/camera-labels.ts');
const place={name:'London',latitude:51.5,longitude:0};
test('all seven other planets and the Moon share calculated positions and date-dependent visual magnitudes',()=>{
 assert.deepEqual(skyBodies.map(String),['Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune']);
 for(const instant of ['2026-01-01T20:00Z','2026-10-07T20:00Z','2027-04-01T20:00Z']){
  const date=new Date(instant),targets=skyTargets(date,place);assert.equal(targets.length,42);
  for(const body of skyBodies){const target=targets.find(t=>t.name===String(body)),position=bodyPosition(body,date,place);assert.equal(target.altitude,position.altitude);assert.equal(target.azimuth,position.azimuth);assert.equal(target.mag,A.Illumination(body,date).mag);assert(Number.isFinite(target.mag))}
 }
});
test('calculated brightness prioritizes the Moon over a colliding star and changes with lunar phase',()=>{
 const full=skyTargets(new Date('2026-10-26T20:00Z'),place),moon=full.find(t=>t.name==='Moon'),sirius=full.find(t=>t.name==='Sirius');
 assert(moon.mag<sirius.mag);const labels=layoutCameraLabels([moon,sirius].map(t=>({...t,x:200,y:200})),{left:0,top:0,width:400,height:400},120,'',[]);assert.deepEqual(labels.map(t=>t.name),['Moon']);
 const newMoon=skyTargets(new Date('2026-10-10T20:00Z'),place).find(t=>t.name==='Moon');assert(newMoon.mag-moon.mag>2);
});
