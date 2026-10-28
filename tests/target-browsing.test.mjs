import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {createDeepSkyBrowsing,createBrightTargetBrowsing}=await vite.ssrLoadModule('/lib/target-browsing.ts');

test('browsing survives view unsubscribe/remount without losing unrelated fields',()=>{
 const store=createDeepSkyBrowsing(),initial=store.getSnapshot();let notifications=0;
 const unsubscribe=store.subscribe(()=>notifications++);
 store.update({query:'M45',selected:'M45'});store.update({savedOnly:true,type:'Open cluster'});
 assert.equal(notifications,2);unsubscribe();
 store.update({above:true});assert.equal(notifications,2);
 const recovered=store.getSnapshot();
 assert.equal(recovered.query,'M45');assert.equal(recovered.selected,'M45');assert.equal(recovered.savedOnly,true);assert.equal(recovered.type,'Open cluster');assert.equal(recovered.above,true);
 assert.equal(initial.query,'');assert.equal(initial.selected,'M31','previous snapshots stay immutable');
 assert.throws(()=>{recovered.query='changed'},TypeError);
 const stop=store.subscribe(()=>notifications++);store.update({magnitude:'9'});assert.equal(notifications,3);stop();
});

test('snapshots are stable until a meaningful change and redundant updates do not notify',()=>{
 const store=createBrightTargetBrowsing(),initial=store.getSnapshot();let calls=0;
 const stop=store.subscribe(()=>calls++);
 assert.equal(store.getSnapshot(),initial);store.update({});store.update({query:'',aboveOnly:false});assert.equal(calls,0);assert.equal(store.getSnapshot(),initial);
 store.update({query:'Vega',savedOnly:true});const changed=store.getSnapshot();assert.notEqual(changed,initial);assert.equal(calls,1);
 store.update({query:'Vega'});assert.equal(store.getSnapshot(),changed);assert.equal(calls,1);
 store.update({aboveThirty:true,constellation:'Lyra'});assert.equal(store.getSnapshot().query,'Vega');assert.equal(store.getSnapshot().savedOnly,true);assert.equal(store.getSnapshot().constellation,'Lyra');assert.equal(createBrightTargetBrowsing().getSnapshot().constellation,'');stop();
});

test('new planner sessions and the two catalogues keep independent browsing',()=>{
 const deep=createDeepSkyBrowsing(),other=createDeepSkyBrowsing(),bright=createBrightTargetBrowsing();
 deep.update({query:'M57',selected:'M57',savedOnly:true});bright.update({query:'Vega',aboveOnly:true});
 assert.equal(other.getSnapshot().query,'');assert.equal(other.getSnapshot().selected,'M31');assert.equal(other.getSnapshot().savedOnly,false);
 assert.equal(deep.getSnapshot().query,'M57');assert.equal(bright.getSnapshot().query,'Vega');
 assert.equal(createBrightTargetBrowsing().getSnapshot().aboveOnly,false);
});

test('diary filters have an independent subscription and survive diary view remounts',()=>{
 const deep=createDeepSkyBrowsing(),diary=deep.diary;let explorerUpdates=0,diaryUpdates=0;
 const stopExplorer=deep.subscribe(()=>explorerUpdates++),stopDiary=diary.subscribe(()=>diaryUpdates++);
 diary.update({query:'M45',outcome:'seen',from:'2026-10-01',through:'2026-10-31',showAll:true});
 assert.equal(explorerUpdates,0,'typing in the diary must not redraw the catalogue');assert.equal(diaryUpdates,1);stopDiary();
 diary.update({from:'invalid'});assert.equal(diaryUpdates,1);assert.equal(diary.getSnapshot().from,'invalid','unfinished filter text stays available for correction');
 const recovered=diary.getSnapshot();assert.equal(recovered.query,'M45');assert.equal(recovered.showAll,true);assert.equal(recovered.outcome,'seen');
 diary.update({query:'',outcome:'',from:'',through:''});assert.equal(diary.getSnapshot().showAll,true,'clearing search filters keeps the separately chosen object scope');
 assert.equal(createDeepSkyBrowsing().diary.getSnapshot().showAll,false);assert.equal(createDeepSkyBrowsing().diary.getSnapshot().query,'');stopExplorer();
});


test('deep-sky comparison retains explicit choices without notifying catalogue or diary subscribers',()=>{
 const deep=createDeepSkyBrowsing(),comparison=deep.comparison;let catalogueCalls=0,diaryCalls=0,comparisonCalls=0;
 const stopCatalogue=deep.subscribe(()=>catalogueCalls++),stopDiary=deep.diary.subscribe(()=>diaryCalls++),stopComparison=comparison.subscribe(()=>comparisonCalls++);
 assert.deepEqual(comparison.getSnapshot(),{open:false,moonBelowOnly:false,chosen:null,horizon:null});
 comparison.update({open:true,chosen:'M31,M45',moonBelowOnly:true});assert.equal(comparisonCalls,1);assert.equal(catalogueCalls,0);assert.equal(diaryCalls,0);
 stopComparison();comparison.update({chosen:''});assert.equal(comparisonCalls,1);assert.equal(comparison.getSnapshot().chosen,'','an intentional empty selection must not become automatic defaults');
 assert.equal(comparison.getSnapshot().open,true);assert.equal(comparison.getSnapshot().moonBelowOnly,true);
 assert.deepEqual(createDeepSkyBrowsing().comparison.getSnapshot(),{open:false,moonBelowOnly:false,chosen:null,horizon:null},'another planner visit starts with automatic choices and a closed comparison');
 stopCatalogue();stopDiary();
});


test('planet browsing survives view remounts while finder searches and other visits remain independent',()=>{
 const finder=createBrightTargetBrowsing(),visibility=finder.visibility;let finderCalls=0,visibilityCalls=0;
 const stopFinder=finder.subscribe(()=>finderCalls++),stopVisibility=visibility.subscribe(()=>visibilityCalls++);
 finder.update({query:'Vega',savedOnly:true});visibility.update({body:'Saturn'});assert.equal(finderCalls,1);assert.equal(visibilityCalls,1);
 stopVisibility();visibility.update({body:'Jupiter'});assert.equal(visibilityCalls,1);assert.equal(visibility.getSnapshot().body,'Jupiter');assert.equal(finder.getSnapshot().query,'Vega');assert.equal(finder.getSnapshot().savedOnly,true);
 assert.equal(createBrightTargetBrowsing().visibility.getSnapshot().body,null,'a new visit starts with automatic altitude ranking');stopFinder();
});

test('comparison horizon draft and applied profile survive unmounts but stay in the planner instance',()=>{
 const planner=createDeepSkyBrowsing(),comparison=planner.comparison,profile={site:'London',draft:['45','0','0','0','0','0','0','0'],applied:'45,0,0,0,0,0,0,0'};
 comparison.update({horizon:profile});const unsubscribe=comparison.subscribe(()=>{});unsubscribe();assert.deepEqual(comparison.getSnapshot().horizon,profile);assert.equal(createDeepSkyBrowsing().comparison.getSnapshot().horizon,null);
});
