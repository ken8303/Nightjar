import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {defaultPhotographyDraft,parsePhotographyDraft,readPhotographyDraft,savePhotographyDraft,makePhotographyDraftRecovery}=await vite.ssrLoadModule('/lib/photography-draft.ts');
const {parsePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
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

test('manual imaging recovery retains incomplete Unicode fields without changing the source or accepting invalid drafts',()=>{
 const draft={...defaultPhotographyDraft(),name:'香港 \u0022觀星\u0022',focal:'',ra:'-',dec:'+',rms:'.',catalogueId:''},before=structuredClone(draft);
 const copy=makePhotographyDraftRecovery(draft,new Date('2026-10-08T21:30:59.987Z')),value=JSON.parse(copy.text);
 assert.equal(value.format,'nightjar-imaging-recovery');assert.equal(copy.exportedAt,'2026-10-08T21:30:59.987Z');assert.deepEqual(value.draft,draft);assert.deepEqual(draft,before);assert.match(value.notice,/cannot be imported/);assert.throws(()=>parsePlannerBackup(copy.text),/not a supported Nightjar backup/);
 assert.throws(()=>makePhotographyDraftRecovery({...draft,name:'x'.repeat(81)}),/could not be prepared/);assert.throws(()=>makePhotographyDraftRecovery(draft,new Date(NaN)),/valid recovery-copy time/);
 const max={...defaultPhotographyDraft(),name:'\u0000'.repeat(80)};for(const key of Object.keys(max)){if(!['name','catalogueId'].includes(key))max[key]='1'.repeat(40)}
 assert(new TextEncoder().encode(makePhotographyDraftRecovery(max).text).length<8192);
});

test('raw localized and invalid numeric text survives storage and manual recovery within its bound',()=>{
 const draft={...defaultPhotographyDraft(),width:'23,5',focal:'12,,5',pixel:'0x10',ra:'incomplete',dec:'−23,5',rms:'1e+',catalogueId:''};
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 assert.equal(savePhotographyDraft(draft,storage),true);assert.deepEqual(readPhotographyDraft(storage),{draft,status:'restored'});
 assert.deepEqual(JSON.parse(makePhotographyDraftRecovery(draft).text).draft,draft);
 assert.equal(savePhotographyDraft({...draft,focal:'x'.repeat(41)},storage),false);assert.deepEqual(readPhotographyDraft(storage).draft,draft);
});
