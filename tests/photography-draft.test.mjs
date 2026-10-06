import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {defaultPhotographyDraft,parsePhotographyDraft,readPhotographyDraft,savePhotographyDraft}=await vite.ssrLoadModule('/lib/photography-draft.ts');
test('imaging drafts retain unfinished edits separately from valid saved equipment',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 assert.equal(readPhotographyDraft(storage).status,'new');
 const draft={...defaultPhotographyDraft(),focal:'',ra:'-',name:'',cols:'3',overlap:'35',rotation:'15',catalogueId:''};
 assert.equal(savePhotographyDraft(draft,storage),true);assert.deepEqual(readPhotographyDraft(storage),{draft,status:'restored'});
 assert.deepEqual([...map.keys()],['nightjar-imaging-draft-v1']);
 assert.equal(parsePhotographyDraft({version:1,draft:{...draft,unknown:'discard'}}).unknown,undefined);
});
test('corrupt, oversized, future-version and malformed drafts recover without writing over stored data',()=>{
 for(const raw of ['{', 'x'.repeat(4097),JSON.stringify({version:2,draft:defaultPhotographyDraft()}),JSON.stringify({version:1,draft:[]}),JSON.stringify({version:1,draft:{...defaultPhotographyDraft(),name:'x'.repeat(81)}}),JSON.stringify({version:1,draft:{...defaultPhotographyDraft(),focal:600}}),JSON.stringify({version:1,draft:{...defaultPhotographyDraft(),catalogueId:'__proto__'}})]){
  const result=readPhotographyDraft({getItem:()=>raw});assert.equal(result.status,'invalid');assert.deepEqual(result.draft,defaultPhotographyDraft());
 }
});
test('blocked storage retains an explicit visit-only status and never reports a successful save',()=>{
 const storage={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
 assert.equal(readPhotographyDraft(storage).status,'visit');assert.equal(savePhotographyDraft(defaultPhotographyDraft(),storage),false);
 assert.equal(savePhotographyDraft({...defaultPhotographyDraft(),width:'bad'},storage),false);
 const copy=defaultPhotographyDraft();copy.width='12';assert.equal(defaultPhotographyDraft().width,'36');
});
