import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {readAtlasView,saveAtlasView,atlasViewKey,readAtlasLayers,saveAtlasLayers,atlasLayersKey}=await vite.ssrLoadModule('/lib/atlas-view.ts');
test('atlas view restores supported values and ignores missing or corrupt preferences',()=>{
 for(const [value,expected] of [['2d','2d'],['3d','3d'],[null,'3d'],['','3d'],['null','3d'],['2D','3d'],['{"view":"2d"}','3d']])assert.equal(readAtlasView({getItem:()=>value}),expected);
});
test('saving and restoring an atlas view leaves other planner data intact',()=>{
 const records=new Map([['nightjar-targets-v1','["Vega"]'],['nightjar-target-notes-v1','{"Vega":"Bring binoculars"}']]);
 const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};
 assert.equal(saveAtlasView('2d',storage),true);assert.equal(records.get(atlasViewKey),'2d');assert.equal(readAtlasView(storage),'2d');
 assert.equal(saveAtlasView('3d',storage),true);assert.equal(readAtlasView(storage),'3d');
 assert.equal(records.get('nightjar-targets-v1'),'["Vega"]');assert.equal(records.get('nightjar-target-notes-v1'),'{"Vega":"Bring binoculars"}');
});
test('blocked storage reads fall back and failed writes report failure without throwing',()=>{
 const blocked={getItem:()=>{throw Error('Storage blocked')},setItem:()=>{throw Error('Quota exceeded')}};
 assert.equal(readAtlasView(blocked),'3d');assert.equal(saveAtlasView('2d',blocked),false);
});
test('missing browser storage is safe during server execution',()=>{
 assert.equal(readAtlasView(),'3d');assert.equal(saveAtlasView('2d'),false);
});

test('atlas layers restore independent boolean choices and default invalid fields',()=>{
 const read=value=>readAtlasLayers({getItem:()=>value});
 const defaults={showLines:true,showLabels:true,showMilkyWay:true};
 for(const value of [null,'null','[]','false','"text"','broken'])assert.deepEqual(read(value),defaults);
 assert.deepEqual(read('{"showLines":false,"showLabels":false,"showMilkyWay":false}'),{showLines:false,showLabels:false,showMilkyWay:false});
 assert.deepEqual(read('{"showLines":false,"showLabels":"false","showMilkyWay":0}'),{showLines:false,showLabels:true,showMilkyWay:true});
});
test('layer saves round trip without changing view or target preferences',()=>{
 const records=new Map([[atlasViewKey,'2d'],['nightjar-targets-v1','["Vega"]']]);
 const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};
 const layers={showLines:false,showLabels:true,showMilkyWay:false};
 assert.equal(saveAtlasLayers({...layers,unexpected:'discard'},storage),true);
 assert.deepEqual(readAtlasLayers(storage),layers);assert.deepEqual(JSON.parse(records.get(atlasLayersKey)),layers);
 assert.equal(records.get(atlasViewKey),'2d');assert.equal(records.get('nightjar-targets-v1'),'["Vega"]');
});
test('layer storage failures preserve safe defaults and report unsuccessful writes',()=>{
 const blocked={getItem:()=>{throw Error('Storage blocked')},setItem:()=>{throw Error('Quota exceeded')}};
 assert.deepEqual(readAtlasLayers(blocked),{showLines:true,showLabels:true,showMilkyWay:true});
 assert.equal(saveAtlasLayers({showLines:false,showLabels:false,showMilkyWay:false},blocked),false);
 assert.deepEqual(readAtlasLayers(),{showLines:true,showLabels:true,showMilkyWay:true});
});
