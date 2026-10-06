import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {findSkyTargets}=await vite.ssrLoadModule('/lib/sky-target-search.ts');
const targets=[{name:'Vega',altitude:61,selected:true},{name:'Alpha Centauri',altitude:-45},{name:'Référence',altitude:30},{name:'Exact horizon',altitude:0},{name:'Above boundary',altitude:30.01}];
test('target search matches mobile Unicode and spacing while retaining original records and order',()=>{
 assert.deepEqual(findSkyTargets(targets,'Ｖ ｅ Ｇ Ａ'),[targets[0]]);assert.equal(findSkyTargets(targets,'alpha\ncentauri')[0],targets[1]);assert.equal(findSkyTargets(targets,'Re\u0301fe\u0301rence')[0],targets[2]);assert.deepEqual(findSkyTargets(targets,'  '),targets);assert.deepEqual(findSkyTargets(targets,'missing'),[]);assert(targets[0].selected);
});
test('strict horizon and 30-degree filters compose with names and leave selection data unchanged',()=>{
 assert.deepEqual(findSkyTargets(targets,'',0),[targets[0],targets[2],targets[4]]);assert.deepEqual(findSkyTargets(targets,'',30),[targets[0],targets[4]]);assert.deepEqual(findSkyTargets(targets,'Référence',30),[]);assert.deepEqual(findSkyTargets(targets,'Vega',30),[targets[0]]);assert.equal(targets[2].altitude,30);
});
