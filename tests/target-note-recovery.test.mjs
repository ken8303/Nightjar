import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {makeTargetNoteRecovery,targetNoteRecoveryMaxBytes}=await vite.ssrLoadModule('/lib/target-note-recovery.ts');
const {parsePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const created=new Date('2026-10-16T20:00:37.125Z');
test('note recovery preserves precise unsaved additions, replacements and removals without mutating their sources',()=>{
 const base={Vega:'Original\n星空',Sirius:null,Polaris:'Remove this',Empty:'',Unrelated:'Exclude me'},edits={Vega:'\n New 星空\n',Sirius:'New note',Polaris:'',Empty:''},before=structuredClone({base,edits});
 const copy=makeTargetNoteRecovery(base,edits,created),parsed=JSON.parse(copy.text);
 assert.equal(copy.notes,4);assert.equal(parsed.format,'nightjar-target-note-recovery');assert.equal(parsed.exportedAt,created.toISOString());
 assert.deepEqual(parsed.data,{base:{Vega:base.Vega,Sirius:null,Polaris:base.Polaris,Empty:''},edits});assert.deepEqual({base,edits},before);
 assert.match(parsed.notice,/Empty edit text means removal/);assert.match(parsed.notice,/cannot be imported/);assert.throws(()=>parsePlannerBackup(copy.text),/not a supported/);
});
test('a full set of escaped Unicode edits and original versions fits the recovery envelope without truncation',()=>{
 const edits=Object.fromEntries(Array.from({length:100},(_,i)=>['Archived '+i,'\0'.repeat(1998)+'星空'])),base={...edits};
 const copy=makeTargetNoteRecovery(base,edits,created);assert.equal(copy.notes,100);assert(new TextEncoder().encode(copy.text).length<=targetNoteRecoveryMaxBytes);assert.deepEqual(JSON.parse(copy.text).data,{base,edits});
});
test('invalid or empty note recovery refuses a misleading copy and leaves edits intact',()=>{
 for(const [base,edits] of [[{},{}],[{},{Vega:'Text'}],[{Vega:42},{Vega:'Text'}],[{Vega:null},{Vega:'x'.repeat(2001)}],[{Vega:null},JSON.parse('{"__proto__":"Text"}')]]){
  const before=structuredClone({base,edits});assert.throws(()=>makeTargetNoteRecovery(base,edits,created));assert.deepEqual({base,edits},before);
 }
 assert.throws(()=>makeTargetNoteRecovery({Vega:null},{Vega:'Text'},new Date(NaN)),/valid recovery-copy time/);
 const edits=Object.fromEntries(Array.from({length:1000},(_,i)=>['Archived '+i,'\0'.repeat(2000)]));assert.throws(()=>makeTargetNoteRecovery(edits,edits,created),/too large/);
});
