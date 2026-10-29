import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {findSkyTargets}=await vite.ssrLoadModule('/lib/sky-target-search.ts');
const targets=[{name:'Vega',altitude:61,selected:true},{name:'Alpha Centauri',altitude:-45},{name:'Référence',altitude:30},{name:'Exact horizon',altitude:0},{name:'Above boundary',altitude:30.01}];
test('saved bright-target scope composes with text and altitude without dropping legacy stored names',()=>{
 const saved=['Vega','Alpha Centauri','Older catalogue name','Vega'],before=[...saved];
 assert.deepEqual(findSkyTargets(targets,'',null,saved),[targets[0],targets[1]]);
 assert.deepEqual(findSkyTargets(targets,'',0,saved),[targets[0]]);
 assert.deepEqual(findSkyTargets(targets,'Alpha',30,saved),[]);
 assert.deepEqual(findSkyTargets(targets,'',null,[]),[]);
 assert.deepEqual(findSkyTargets(targets,'',null,['Older catalogue name']),[]);
 assert.deepEqual(saved,before);assert.equal(findSkyTargets(targets,'',null,saved)[0],targets[0]);
});
test('target search matches mobile Unicode and spacing while retaining original records and order',()=>{
 assert.deepEqual(findSkyTargets(targets,'Ｖ ｅ Ｇ Ａ'),[targets[0]]);assert.equal(findSkyTargets(targets,'alpha\ncentauri')[0],targets[1]);assert.equal(findSkyTargets(targets,'Re\u0301fe\u0301rence')[0],targets[2]);assert.deepEqual(findSkyTargets(targets,'  '),targets);assert.deepEqual(findSkyTargets(targets,'missing'),[]);assert(targets[0].selected);
 assert.deepEqual(findSkyTargets(targets,'織女星'),[targets[0]]);assert.deepEqual(findSkyTargets(targets,'織女星',null,['Alpha Centauri']),[]);
});
test('strict horizon and 30-degree filters compose with names and leave selection data unchanged',()=>{
 assert.deepEqual(findSkyTargets(targets,'',0),[targets[0],targets[2],targets[4]]);assert.deepEqual(findSkyTargets(targets,'',30),[targets[0],targets[4]]);assert.deepEqual(findSkyTargets(targets,'Référence',30),[]);assert.deepEqual(findSkyTargets(targets,'Vega',30),[targets[0]]);assert.equal(targets[2].altitude,30);
});

test('searches the active language as well as Chinese aliases without changing saved identities',async()=>{
 const {messageCatalogues}=await vite.ssrLoadModule('/lib/messages/index.ts');
 messageCatalogues['test-language']={'target.Vega':'Vega translated'};
 try{
  const saved=['Vega'],before=[...saved];
  assert.deepEqual(findSkyTargets(targets,'Vega translated',30,saved,'test-language'),[targets[0]]);
  assert.deepEqual(findSkyTargets(targets,'織女星',30,saved,'test-language'),[targets[0]]);
  assert.deepEqual(findSkyTargets(targets,'Vega',30,saved,'test-language'),[targets[0]]);
  assert.deepEqual(findSkyTargets(targets,'Vega translated',30,['Alpha Centauri'],'test-language'),[]);
  assert.deepEqual(saved,before);assert.equal(targets[0].name,'Vega');
 }finally{delete messageCatalogues['test-language']}
});
