import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {createPlannerNavigation}=await vite.ssrLoadModule('/lib/planner-navigation.ts');
const site={name:'Queued site QA',latitude:51.5,longitude:0,timezone:'UTC'};
function harness(){const applied=[],pending=[];return {applied,pending,apply:intent=>applied.push(intent),navigation:createPlannerNavigation({onPending:intent=>pending.push(intent)})}}
test('blocked context requests preserve site, time and catalogue together until explicit continuation',()=>{
 const h=harness(),date=new Date('2026-10-08T20:00:00.123Z'),intent={kind:'context',section:'sky',place:{...site},date,deepTarget:'M31',persist:false};
 assert.equal(h.navigation.request(intent,true,h.apply),false);assert.deepEqual(h.applied,[]);assert.equal(h.pending.at(-1).deepTarget,'M31');
 intent.place.name='Mutated later';intent.place.latitude=0;date.setUTCHours(1);intent.deepTarget='M13';
 assert.equal(h.navigation.continue(h.apply),true);assert.equal(h.applied.length,1);assert.deepEqual(h.applied[0].place,site);assert.equal(h.applied[0].date.toISOString(),'2026-10-08T20:00:00.123Z');assert.equal(h.applied[0].deepTarget,'M31');assert.equal(h.applied[0].persist,false);assert.equal(h.pending.at(-1),null);assert.equal(h.navigation.continue(h.apply),false);
});
test('keeping edits cancels the queued context without partially applying it',()=>{
 const h=harness();h.navigation.request({kind:'context',section:'tonight',place:site,date:new Date('2026-10-09T01:00Z')},true,h.apply);h.navigation.cancel();assert.deepEqual(h.applied,[]);assert.equal(h.pending.at(-1),null);assert.equal(h.navigation.continue(h.apply),false);
 assert.equal(h.navigation.request({kind:'section',section:'places'},false,h.apply),true);assert.deepEqual(h.applied,[{kind:'section',section:'places'}]);
});
test('new section or allowed context requests supersede an older queued site plan',()=>{
 const h=harness();h.navigation.request({kind:'context',section:'tonight',place:site,deepTarget:'M31'},true,h.apply);h.navigation.request({kind:'section',section:'moon'},true,h.apply);h.navigation.continue(h.apply);assert.deepEqual(h.applied,[{kind:'section',section:'moon'}]);
 h.navigation.request({kind:'section',section:'tools'},true,h.apply);const next={kind:'context',section:'tonight',place:{...site,name:'Latest QA'}};assert.equal(h.navigation.request(next,false,h.apply),true);assert.deepEqual(h.applied.at(-1),next);assert.equal(h.navigation.continue(h.apply),false);
});
test('applying one queued request cannot clear a new request queued during its application',()=>{
 const pending=[],applied=[];const navigation=createPlannerNavigation({onPending:intent=>pending.push(intent)});
 const apply=intent=>{applied.push(intent);if(intent.kind==='section')navigation.request({kind:'context',section:'tonight',place:site},true,apply)};
 navigation.request({kind:'section',section:'sky'},true,apply);navigation.continue(apply);assert.equal(pending.at(-1).kind,'context');assert.equal(applied.length,1);navigation.continue(apply);assert.equal(applied.length,2);assert.equal(applied[1].place.name,site.name);assert.equal(pending.at(-1),null);
});
