import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readPlannerSetup}=await vite.ssrLoadModule('/lib/planner-state.ts');
test('startup ignores malformed recovery dates without losing the saved site and restores canonical seconds/milliseconds',()=>{
 const priorLocal=globalThis.localStorage,priorSession=globalThis.sessionStorage,site={name:'Recovery site',latitude:51.5,longitude:0,timezone:'Europe/London'},now=new Date('2026-10-07T20:00Z');let token=null;
 globalThis.localStorage={getItem:key=>key==='nightjar-place'?JSON.stringify(site):key==='nightjar-places'?JSON.stringify([site]):null};globalThis.sessionStorage={getItem:()=>token};
 try{const baseline=readPlannerSetup(now);for(const value of ['2026-02-30T20:00:00.000Z','0000-01-01T00:00:00.000Z','+010000-01-01T00:00:00.000Z','not a date']){token=JSON.stringify(value);const setup=readPlannerSetup(now);assert.equal(+setup.date,+baseline.date);assert.deepEqual(setup.place,site);assert.deepEqual(setup.saved,[site]);assert.equal(token,JSON.stringify(value))}token=JSON.stringify('2026-10-07T23:59:59.987Z');assert.equal(readPlannerSetup(now).date.toISOString(),'2026-10-07T23:59:59.987Z');assert.equal(readPlannerSetup(now).date.toISOString(),'2026-10-07T23:59:59.987Z');}
 finally{if(priorLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=priorLocal;if(priorSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=priorSession;}
});
