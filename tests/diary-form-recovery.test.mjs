import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {makeDiaryFormRecovery,diaryFormRecoveryMaxBytes}=await vite.ssrLoadModule('/lib/diary-form-recovery.ts');
const {parsePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const {messierCatalogue}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const entry={id:'pending-M31',target:'M31',observedAt:'2026-10-07T20:00:00.000Z',place:{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London',country:'United Kingdom'},outcome:'seen',equipment:'Binoculars',notes:'Unsaved 星空\nNew local text.'},created=new Date('2026-10-07T22:00:00.123Z');
test('form copies preserve current unsaved text, edit originals and precise metadata without changing their source',()=>{
 const original={...entry,id:'record-M45',target:'M45'},state={drafts:[entry],edit:{original,draft:{...original,notes:'Pending edit'}}},before=structuredClone(state),copy=makeDiaryFormRecovery(state,created),parsed=JSON.parse(copy.text);
 assert.equal(parsed.format,'nightjar-form-recovery');assert.equal(parsed.exportedAt,created.toISOString());assert.deepEqual(parsed.data,state);assert.equal(copy.forms,2);assert.deepEqual(state,before);assert(parsed.notice.includes('cannot be imported'));assert.throws(()=>parsePlannerBackup(copy.text),/not a supported/);
});
test('full-capacity escaped and Unicode form text fits the recovery envelope without truncation',()=>{
 const state={drafts:messierCatalogue.map(target=>({...entry,id:'draft-'+target.id,target:target.id,place:{...entry.place,name:'A'+'\0'.repeat(198),country:'B'+'\0'.repeat(198)},equipment:'\0'.repeat(100),notes:'\0'.repeat(1990)+'星空'.repeat(5)})),edit:null},copy=makeDiaryFormRecovery(state,created),parsed=JSON.parse(copy.text);
 assert.equal(copy.forms,109);assert(new TextEncoder().encode(copy.text).length<=diaryFormRecoveryMaxBytes);assert.deepEqual(parsed.data,state);
});
test('invalid form data and export times refuse a misleading copy while retaining the supplied values',()=>{
 const state={drafts:[{...entry,notes:'x'.repeat(2001)}],edit:null},before=structuredClone(state);assert.throws(()=>makeDiaryFormRecovery(state,created));assert.deepEqual(state,before);assert.throws(()=>makeDiaryFormRecovery({drafts:[entry],edit:null},new Date(NaN)),/valid recovery-copy time/);
});
