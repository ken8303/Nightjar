import assert from 'node:assert/strict';import {test,after} from 'node:test';import {fileURLToPath} from 'node:url';import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {deepSkyCatalogue,messierCatalogue,findDeepSky,deepSkyRecommendations}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {validDeepSkyId,validMessierId,readDeepSkyList,saveDeepSkyList,deepSkyListLimit}=await vite.ssrLoadModule('/lib/deep-sky-list.ts');
const {makePlannerBackup,parsePlannerBackup,restorePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const {saveDiary,normalizeDiary}=await vite.ssrLoadModule('/lib/observing-diary.ts');
const {normalizeDiaryDrafts,saveDiaryDrafts,readStoredDiaryDrafts}=await vite.ssrLoadModule('/lib/diary-drafts.ts');
const site={name:'Expansion QA',latitude:51.5,longitude:0,timezone:'UTC'},date=new Date('2026-10-27T00:00Z');
const store=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)}};
test('curated expansion contains 200 distinct non-Messier records and retains original catalogue identities',()=>{
 assert.equal(messierCatalogue.length,109);assert.equal(deepSkyCatalogue.length,309);assert.equal(deepSkyListLimit,309);assert.equal(new Set(deepSkyCatalogue.map(target=>target.id)).size,309);
 const extra=deepSkyCatalogue.filter(target=>!validMessierId(target.id));assert.equal(extra.length,200);
 for(const target of extra){assert(validDeepSkyId(target.id));assert(target.ra>=0&&target.ra<24);assert(Math.abs(target.dec)<=90);assert(target.major===null||target.major>0);assert(!messierCatalogue.some(old=>old.catalogue===target.catalogue))}
 for(const id of ['M102','NGC1','NGC99999','IC9999','NGC07000'])assert(!validDeepSkyId(id));
 const north=findDeepSky('NGC 07000','')[0];assert.equal(north.id,'NGC7000');assert.equal(north.magnitude,null);assert.equal(north.major,120);assert(Math.abs(north.ra-(20+59/60+17.14/3600))<1e-12);assert(Math.abs(north.dec-(44+31/60+43.6/3600))<1e-12);
 assert.equal(findDeepSky('Pelican Nebula','')[0].id,'IC5070');assert.equal(findDeepSky('Flaming Star Nebula','')[0].id,'IC405');assert.equal(findDeepSky('Small Magellanic Cloud','')[0].id,'NGC292');assert.equal(findDeepSky('Fornax A','')[0].id,'NGC1316');assert.equal(findDeepSky('Blue Flash Nebula','')[0].id,'NGC6905');assert.equal(findDeepSky('Tarantula Nebula','')[0].id,'NGC2070');assert.equal(findDeepSky('Saturn Nebula','')[0].id,'NGC7009');assert.equal(findDeepSky('Iris Nebula','')[0].id,'NGC7023');assert.equal(findDeepSky('Bubble Nebula','')[0].id,'NGC7635');assert.equal(findDeepSky('Centaurus A','')[0].id,'NGC5128');assert.equal(findDeepSky('Needle Galaxy','')[0].id,'NGC4565');assert.equal(findDeepSky('Omega Centauri','')[0].id,'NGC5139');assert.equal(findDeepSky('Helix','')[0].id,'NGC7293');assert(!findDeepSky('NGC7000','',{maximumMagnitude:20}).length);
});
test('expanded saved targets and diaries round-trip through backups without losing legacy Messier entries',()=>{
 const storage=store();saveDeepSkyList(['M31','NGC7000','IC1396','NGC5128','NGC7023','NGC2070','NGC6905','IC405','IC5070'],storage);
 const entry={id:'new-object',target:'NGC7000',observedAt:date.toISOString(),place:site,outcome:'seen',equipment:'Binoculars',notes:'Saved new catalogue target'};saveDiary([entry],storage);
 const backup=parsePlannerBackup(JSON.stringify(makePlannerBackup(storage,date))),restored=store();restorePlannerBackup(restored,backup);
 assert.deepEqual(readDeepSkyList(restored),['M31','NGC7000','IC1396','NGC5128','NGC7023','NGC2070','NGC6905','IC405','IC5070']);assert.equal(JSON.parse(restored.getItem('nightjar-observing-diary-v1'))[0].target,'NGC7000');
 const all=deepSkyCatalogue.map(target=>target.id);saveDeepSkyList(all,restored);assert.deepEqual(readDeepSkyList(restored),all);
});
test('every catalogue object can retain a maximum-length unfinished diary form',()=>{
 const forms=deepSkyCatalogue.map((target,index)=>({id:`draft-${index}`,target:target.id,observedAt:date.toISOString(),place:{...site,name:'\u0000'.repeat(199),country:'\u0000'.repeat(199)},outcome:'seen',equipment:'\u0000'.repeat(100),notes:'\u0000'.repeat(2000)}));
 assert.throws(()=>normalizeDiary(forms),/invalid entries/,'the saved diary retains its separate 200-entry limit');
 const state=normalizeDiaryDrafts({version:1,drafts:forms,edit:null}),storage=store();assert(saveDiaryDrafts(state,storage));assert(storage.getItem('nightjar-diary-drafts-v1').length>2*1024*1024);assert.equal(readStoredDiaryDrafts(storage).drafts.length,309);
});
test('full expanded catalogue recommendations remain bounded and exclude polar daylight',()=>{
 assert(deepSkyRecommendations(deepSkyCatalogue,date,site).size>0);
 assert.equal(deepSkyRecommendations(deepSkyCatalogue,new Date('2026-06-21T12:00Z'),{...site,latitude:90}).size,0);
 assert.throws(()=>deepSkyRecommendations([...deepSkyCatalogue,deepSkyCatalogue[0]],date,site),/309/);
});

test('catalogue selections combine with search, type, magnitude and saved targets',()=>{
 const messier=findDeepSky('','',{catalogue:'messier'}),ngc=findDeepSky('','',{catalogue:'ngc'}),ic=findDeepSky('','',{catalogue:'ic'});
 assert.equal(messier.length,109);assert.equal(ngc.length,181);assert.equal(ic.length,19);
 assert(messier.some(target=>target.id==='M31'));assert(!ngc.some(target=>target.id==='M31'));
 assert.deepEqual(findDeepSky('NGC 7000','',{catalogue:'ngc'}).map(target=>target.id),['NGC7000']);
 assert.equal(findDeepSky('NGC 7000','',{catalogue:'messier'}).length,0);
 assert.deepEqual(findDeepSky('','Cluster with nebulosity',{catalogue:'ic',maximumMagnitude:7,savedIds:['IC1805']}).map(target=>target.id),['IC1805']);
 assert.equal(findDeepSky('','',{catalogue:'ic',maximumMagnitude:7,savedIds:['IC1396']}).length,0);
});

test('unknown-magnitude filter finds objects without a listed magnitude and composes with catalogue and type',()=>{
 const unknown=findDeepSky('','',{catalogue:'ngc',type:'H II region',unknownMagnitudeOnly:true});
 assert(unknown.some(target=>target.id==='NGC7000'));assert(unknown.every(target=>target.magnitude===null));
 assert.equal(findDeepSky('NGC7000','',{unknownMagnitudeOnly:true}).length,1);
 assert.equal(findDeepSky('NGC7000','',{maximumMagnitude:15}).length,0);
 assert.equal(findDeepSky('NGC7000','',{maximumMagnitude:15,unknownMagnitudeOnly:true}).length,0);
 assert.equal(findDeepSky('M31','',{unknownMagnitudeOnly:true}).length,0);
});
