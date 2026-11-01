import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
import {offlineDeepSkyPosition,offlineDeepSkyBest} from '../public/offline-darkness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {deepSkyCatalogue,deepSkyPosition,deepSkyRecommendations,createDeepSkyRecommendationJob}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {validDeepSkyId,saveDeepSkyList,readDeepSkyList,deepSkyListLimit}=await vite.ssrLoadModule('/lib/deep-sky-list.ts');
const {saveDiary}=await vite.ssrLoadModule('/lib/observing-diary.ts');
const {makePlannerBackup,parsePlannerBackup,restorePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const {compareDeepSky}=await vite.ssrLoadModule('/lib/deep-sky-comparison.ts');
const {deepSkyWindowCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
const site={name:'London',latitude:51.5,longitude:0,timezone:'UTC'},date=new Date('2026-10-27T00:00:00.000Z');
const store=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}};
test('expanded targets survive saved list, diary and backup round-trip without changing existing IDs',()=>{
 const ids=['M31','NGC1','IC3322A','IC275 NED01'];assert(ids.every(validDeepSkyId));assert.equal(deepSkyListLimit,469);
 const source=store();saveDeepSkyList(ids,source);saveDiary([{id:'new-object',target:'IC275 NED01',observedAt:date.toISOString(),place:site,outcome:'seen',equipment:'',notes:'Reference target'}],source);
 const backup=parsePlannerBackup(JSON.stringify(makePlannerBackup(source,date))),destination=store();restorePlannerBackup(destination,backup);
 assert.deepEqual(readDeepSkyList(destination),ids);assert.equal(JSON.parse(destination.getItem('nightjar-observing-diary-v1'))[0].target,'IC275 NED01');
 assert(!validDeepSkyId('IC1064'));assert(!validDeepSkyId('M102'));
 const overLimit=JSON.stringify(deepSkyCatalogue.slice(0,deepSkyListLimit+1).map(target=>target.id));assert.throws(()=>readDeepSkyList({getItem:()=>overLimit}),/list limit/);assert.equal(JSON.parse(overLimit).length,deepSkyListLimit+1);
});
test('expanded objects have identical online and offline positions and observing opportunities',()=>{
 for(const id of ['NGC1','IC3322A','IC275 NED01']){
  const target=deepSkyCatalogue.find(item=>item.id===id);assert(target);
  const expected=deepSkyPosition(target,date,site),actual=offlineDeepSkyPosition(date.toISOString(),site,id);
  assert(Math.abs(expected.altitude-actual.altitude)<1e-9);assert(Math.abs(expected.azimuth-actual.azimuth)<1e-9);
  const offline=offlineDeepSkyBest(date.toISOString(),site,id),online=deepSkyRecommendations([target],date,site).get(id);
  assert.equal(offline?.time,online?.date.toISOString());
 }
});
test('batched recommendations equal the synchronous calculation and preserve horizon filtering',()=>{
 const targets=deepSkyCatalogue.slice(400,650),horizon=[10,15,20,25,30,35,40,45],job=createDeepSkyRecommendationJob(targets,date,site,horizon);
 assert.equal(job.step(13),false);while(!job.step(13)){}assert.deepEqual(job.recommendations,deepSkyRecommendations(targets,date,site,horizon));assert.throws(()=>job.step(0));
});
test('calendar UID safely encodes a component identifier containing a space',()=>{
 const target=deepSkyCatalogue.find(item=>item.id==='IC275 NED01');const row=compareDeepSky([target],date,site)[0],window=row.windows[0];assert(window);
 const text=deepSkyWindowCalendar({target,place:site,start:window.start,end:window.end,samples:row.samples,moonBelowOnly:false},date);assert.match(text,/UID:deep-sky-IC275%20NED01-/);
});
test('every positioned non-historical OpenNGC source entry maps to a planning record',async()=>{
 const {readFile}=await import('node:fs/promises');const rows=JSON.parse(await readFile(new URL('../data/opengc-reference-index.json',import.meta.url),'utf8'));
 const normalize=value=>value.normalize('NFKC').toLowerCase().replace(/\s+/g,'').replace(/(ngc|ic|m)0+(?=\d)/g,'$1');
 const known=new Set(deepSkyCatalogue.map(target=>normalize(target.catalogue))),source=rows.filter(row=>row[1]!=='Dup'&&row[1]!=='NonEx');
 assert.equal(source.length,13309);assert(source.every(row=>known.has(normalize(row[0]))));
});
