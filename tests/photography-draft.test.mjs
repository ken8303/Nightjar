import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {defaultPhotographyDraft,parsePhotographyDraft,readPhotographyDraft,savePhotographyDraft,savePhotographyDraftPatch,makePhotographyDraftRecovery}=await vite.ssrLoadModule('/lib/photography-draft.ts');
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
test('blocked storage distinguishes an unavailable read from an unsaved visit edit',()=>{
 const storage={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};
 assert.equal(readPhotographyDraft(storage).status,'unavailable');assert.equal(savePhotographyDraft(defaultPhotographyDraft(),storage),false);
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


test('saving an explicit imaging patch retains newer unrelated equipment and target fields',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value}};
 savePhotographyDraft(defaultPhotographyDraft(),storage);const stale=readPhotographyDraft(storage).draft;
 const peer={...stale,focal:'1000',ra:'18.6',dec:'38.7',catalogueId:'',rotation:'45'};savePhotographyDraft(peer,storage);
 const result=savePhotographyDraftPatch(stale,{name:'Second tab 香港'},storage);
 assert.equal(result.saved,true);assert.deepEqual(result.draft,{...peer,name:'Second tab 香港'});assert.deepEqual(readPhotographyDraft(storage).draft,result.draft);
 assert.equal(stale.focal,'400','the original snapshot is not mutated');
});

test('pending raw imaging fields survive failed writes and merge with a later peer update on retry',()=>{
 let raw=null,blocked=false;const storage={getItem:()=>raw,setItem:(key,value)=>{if(blocked)throw Error('quota');raw=value}};
 savePhotographyDraft(defaultPhotographyDraft(),storage);const local=readPhotographyDraft(storage).draft;blocked=true;
 const pending={ra:'-',name:'Unsaved 香港'};const failed=savePhotographyDraftPatch(local,pending,storage);assert.equal(failed.saved,false);assert.equal(failed.draft.ra,'-');
 blocked=false;savePhotographyDraft({...local,focal:'1200',rotation:'35'},storage);
 const retried=savePhotographyDraftPatch(failed.draft,pending,storage);assert.equal(retried.saved,true);assert.equal(retried.draft.focal,'1200');assert.equal(retried.draft.rotation,'35');assert.equal(retried.draft.ra,'-');assert.equal(retried.draft.name,pending.name);
});

test('unreadable saved imaging fields cannot be overwritten before a successful read',()=>{
 let raw=null,denyRead=false,writes=0;const storage={getItem:()=>{if(denyRead)throw Error('denied');return raw},setItem:(key,value)=>{writes++;raw=value}};
 const local=defaultPhotographyDraft();savePhotographyDraft({...local,focal:'800'},storage);denyRead=true;
 const failed=savePhotographyDraftPatch(local,{name:'Local edit'},storage);assert.equal(failed.saved,false);assert.equal(writes,1);assert.equal(failed.draft.name,'Local edit');
 denyRead=false;const recovered=savePhotographyDraftPatch(failed.draft,{name:'Local edit'},storage);assert.equal(recovered.saved,true);assert.equal(recovered.draft.focal,'800');assert.equal(writes,2);
});

test('new or invalid imaging data retains the displayed fields when an edit starts a new draft',()=>{
 for(const initial of [null,'{bad']){let raw=initial;const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value}};const local={...defaultPhotographyDraft(),width:'23,5'};
 const result=savePhotographyDraftPatch(local,{name:'New setup'},storage);assert.equal(result.saved,true);assert.equal(result.draft.width,'23,5');assert.equal(readPhotographyDraft(storage).draft.name,'New setup');}
});

test('a replaced imaging write or failed verification remains an unsaved visit draft',()=>{
 for(const mode of ['replaced','denied']){const local=defaultPhotographyDraft();let raw=JSON.stringify({version:1,draft:local}),written=false;
 const storage={getItem:()=>{if(written&&mode==='denied')throw Error('denied');return raw},setItem:(key,value)=>{written=true;raw=mode==='replaced'?JSON.stringify({version:1,draft:{...local,name:'Peer replacement'}}):value}};
 const result=savePhotographyDraftPatch(local,{name:'My edit'},storage);assert.equal(result.saved,false);assert.equal(result.draft.name,'My edit');}
});
