import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {cameraCatalogueTargets,cameraCataloguePhoto,searchCameraTargets,initialCameraView}=await vite.ssrLoadModule('/lib/camera-catalogue.ts');
const {messierCatalogue,deepSkyPosition}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {skyTargets}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'London',latitude:51.5085,longitude:-.1257},date=new Date('2026-10-07T20:00Z');
test('camera catalogue modes have stable unique identities and retain every original bright target',()=>{
 const bright=cameraCatalogueTargets(date,place,'bright'),deep=cameraCatalogueTargets(date,place,'deep-sky'),all=cameraCatalogueTargets(date,place,'all');
 assert.equal(bright.length,42);assert.equal(deep.length,109);assert.equal(all.length,151);assert.equal(new Set(all.map(t=>t.name)).size,151);
 assert.deepEqual(bright.map(target=>Object.fromEntries(Object.entries(target).filter(([key])=>key!=='displayName'&&key!=='deepSky'))),skyTargets(date,place));
 assert(bright.every(t=>!t.deepSky&&t.displayName===t.name));assert(deep.every(t=>t.deepSky));assert(!deep.some(t=>t.name==='M102'));
});
test('deep camera directions agree with explorer date-frame positions while retaining catalogue identifiers',()=>{
 const targets=cameraCatalogueTargets(date,place,'deep-sky');
 targets.forEach((target,index)=>{
  const source=messierCatalogue[index],position=deepSkyPosition(source,date,place);
  assert.equal(target.name,source.id);assert.equal(target.altitude,position.altitude);assert.equal(target.azimuth,position.azimuth);assert(Number.isFinite(target.mag));
  assert(target.displayName.startsWith(source.id+' · '));
 });
});
test('camera reference photos retain survey coordinates and source attribution for Messier selections',()=>{
 const photo=cameraCataloguePhoto('M31'),params=new URL(photo.src).searchParams;
 assert.equal(params.get('e'),'J2000');assert.equal(params.get('r'),'0:42:44');assert(photo.caption.includes('M31'));assert(photo.source.includes('stsci.edu'));assert(photo.survey);
 assert.equal(cameraCataloguePhoto('Unknown object'),undefined);assert(cameraCataloguePhoto('Polaris').survey);assert(cameraCataloguePhoto('Moon').credit.includes('NASA'));
});

test('camera search discovers Messier/NGC identities and alternate names with Unicode normalization',()=>{
 const all=cameraCatalogueTargets(date,place,'all');
 for(const query of ['M31','Ｍ３１','m 0 0 3 1','NGC 0224','Andromeda'])assert(searchCameraTargets(all,query).some(target=>target.name==='M31'),query);
 assert.deepEqual(searchCameraTargets(all,'s i r i u s').map(target=>target.name),['Sirius']);
 assert.deepEqual(searchCameraTargets(all,'ＳＩＲＩＵＳ').map(target=>target.name),['Sirius']);
 assert.deepEqual(searchCameraTargets(all,'not-in-this-catalogue'),[]);
 assert.equal(searchCameraTargets(all,'').length,151);
 assert.equal(searchCameraTargets(cameraCatalogueTargets(date,place,'bright'),'M31').length,0);
});
test('camera search leaves catalogue positions, ordering and selected-record source intact',()=>{
 const all=cameraCatalogueTargets(date,place,'all'),before=structuredClone(all),selected=all.find(target=>target.name==='M13');
 const results=searchCameraTargets(all,'M31');assert(!results.some(target=>target.name===selected.name));assert(all.includes(selected));assert.deepEqual(all,before);
 assert.equal(results[0],all.find(target=>target.name===results[0].name));
});

test('a direct Messier camera preview selects its catalogue and centres an above-horizon direction without changing the source instant',async()=>{
 const {manualCameraBasis,targetDirectionGuide}=await vite.ssrLoadModule('/lib/camera-sky.ts'),time=new Date('2026-10-07T14:00Z'),view=initialCameraView(time,place,'M13'),position=deepSkyPosition(messierCatalogue.find(target=>target.id==='M13'),time,place);
 assert.equal(view.mode,'deep-sky');assert.equal(view.selected,'M13');assert.equal(+view.date,+time);assert.notEqual(view.date,time);assert(position.altitude>0);
 assert(targetDirectionGuide(manualCameraBasis(view.bearing,view.altitude),position.altitude,position.azimuth).separation<1);
 assert.equal(time.toISOString(),'2026-10-07T14:00:00.000Z');
});
test('a below-horizon preset retains the target with safe manual defaults, while an unknown ID opens the ordinary catalogue',()=>{
 const time=new Date('2026-10-07T14:00Z'),view=initialCameraView(time,place,'M42');
 assert(deepSkyPosition(messierCatalogue.find(target=>target.id==='M42'),time,place).altitude<0);assert.equal(view.mode,'deep-sky');assert.equal(view.selected,'M42');assert.equal(view.bearing,0);assert.equal(view.altitude,30);
 for(const id of [undefined,'M102','Not a catalogue object']){const ordinary=initialCameraView(time,place,id);assert.equal(ordinary.mode,'bright');assert.equal(ordinary.selected,'');assert.equal(ordinary.bearing,0)}
});
