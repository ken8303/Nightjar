import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {referencePlanningTarget}=await vite.ssrLoadModule('/lib/opengc-reference-target.ts');
const base={id:'NGC0001',type:'G',ra:'00:07:15.84',dec:'+27:42:29.1',constellation:'Peg',magnitude:'12.93',names:''};
test('reference planning preserves source coordinates and missing magnitudes',()=>{
 const result=referencePlanningTarget(base);assert(Math.abs(result.ra-(7/60+15.84/3600))<1e-12);assert(Math.abs(result.dec-(27+42/60+29.1/3600))<1e-12);assert.equal(result.magnitude,12.93);
 const south=referencePlanningTarget({...base,dec:'-72:04:53.2',magnitude:''});assert(south.dec<0);assert.equal(south.magnitude,null);assert.equal(referencePlanningTarget({...base,dec:'+07:12:60.0'}).dec,7+13/60);
});
test('historical duplicates, unidentified and invalid positions cannot become planning targets',()=>{
 for(const patch of [{type:'Dup'},{type:'NonEx'},{ra:''},{dec:''},{ra:'24:00:00'},{dec:'+90:00:01'},{ra:'00:60:00'},{dec:'-20:00:60.1'}])assert.equal(referencePlanningTarget({...base,...patch}),null);
});
test('every non-historical OpenNGC record has a valid preview position without changing source IDs',async()=>{
 const {readFile}=await import('node:fs/promises');const rows=JSON.parse(await readFile(new URL('../data/opengc-reference-index.json',import.meta.url),'utf8'));
 let count=0;for(const [id,type,ra,dec,constellation,magnitude,names] of rows){
  const target=referencePlanningTarget({id,type,ra,dec,constellation,magnitude,names});
  if(type==='Dup'||type==='NonEx')assert.equal(target,null);
  else{assert(target,`${id} should have a valid position`);assert.equal(target.id,id);assert(target.ra>=0&&target.ra<24);assert(Math.abs(target.dec)<=90);count++}
 }
 assert.equal(count,13309);
});
