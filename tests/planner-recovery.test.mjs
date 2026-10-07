import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {makePlannerRecovery}=await vite.ssrLoadModule('/lib/planner-recovery.ts');
const {parsePlannerBackup}=await vite.ssrLoadModule('/lib/planner-backup.ts');
const now=new Date('2026-10-07T20:00:00.123Z');
test('raw recovery keeps exact malformed and Unicode data, missing/null distinctions and only known app keys',()=>{
 const local=new Map([['nightjar-target-notes-v1','{broken\n星空'],['nightjar-diary-drafts-v1','unfinished text'],['nightjar-places',''],['unrelated-secret','excluded']]),session=new Map([['nightjar-current-time-v1','"2026-10-07T20:00:00.000Z"']]),calls=[];
 const read=map=>({getItem:key=>{calls.push(key);return map.get(key)??null}}),before=structuredClone([local,session]),result=makePlannerRecovery(read(local),read(session),now),raw=JSON.parse(result.text);
 assert.equal(raw.format,'nightjar-raw-recovery');assert.equal(raw.exportedAt,now.toISOString());assert.equal(raw.stores.local['nightjar-target-notes-v1'],local.get('nightjar-target-notes-v1'));assert.equal(raw.stores.local['nightjar-places'],'');assert.equal(raw.stores.local['nightjar-equipment'],null);assert.equal(raw.stores.local['nightjar-diary-drafts-v1'],'unfinished text');assert(!calls.includes('unrelated-secret'));assert.deepEqual(result.unreadable,[]);assert.deepEqual([local,session],before);assert.throws(()=>parsePlannerBackup(result.text),/not a supported/);
});
test('partial recovery reports unreadable keys and continues with other values without inventing missing data',()=>{
 const result=makePlannerRecovery({getItem:key=>{if(key==='nightjar-places')throw Error('Blocked');return key==='nightjar-targets-v1'?'["Vega"]':null}},{getItem:()=>null},now),raw=JSON.parse(result.text);
 assert.deepEqual(result.unreadable,[{area:'local',key:'nightjar-places'}]);assert(!Object.hasOwn(raw.stores.local,'nightjar-places'));assert.equal(raw.stores.local['nightjar-targets-v1'],'["Vega"]');
});
test('fully blocked storage refuses an empty recovery claim and oversized keys are explicitly excluded',()=>{
 const blocked={getItem:()=>{throw Error('Blocked')}};assert.throws(()=>makePlannerRecovery(blocked,blocked,now),/could not be read/);
 const result=makePlannerRecovery({getItem:key=>key==='nightjar-places'?'x'.repeat(8*1024*1024+1):null},{getItem:()=>null},now);assert.deepEqual(result.unreadable,[{area:'local',key:'nightjar-places'}]);assert(!Object.hasOwn(JSON.parse(result.text).stores.local,'nightjar-places'));
});
