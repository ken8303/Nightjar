import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readAuroraResponse,auroraFailureMessage}=await vite.ssrLoadModule('/lib/aurora-response.ts');
test('Aurora HTTP failures reject before consuming arbitrary error bodies',async()=>{
 let reads=0;await assert.rejects(readAuroraResponse({ok:false,json:async()=>{reads++;throw new SyntaxError('HTML proxy QA')}}),/aurora feed is temporarily unavailable/);assert.equal(reads,0);
});
test('Aurora decoder failures provide retry guidance while retaining body-abort identity',async()=>{
 for(const error of [new SyntaxError('Unexpected token < QA'),new TypeError('Body disturbed QA')])await assert.rejects(readAuroraResponse({ok:true,json:async()=>{throw error}}),{message:'Aurora response is unreadable. Please retry.'});
 const error=new DOMException('Aborted QA','AbortError');await assert.rejects(readAuroraResponse({ok:true,json:async()=>{throw error}}),received=>received===error);
});
test('Aurora response validation still rejects unusable data and normalizes valid feed timestamps',async()=>{
 await assert.rejects(readAuroraResponse({ok:true,json:async()=>({cells:[]})}),/unreadable/);
 const raw={observedAt:'2026-10-09T14:00:00Z',forecastAt:'2026-10-09T14:30:00Z',fetchedAt:'2026-10-09T14:05:00Z',cells:Array.from({length:100},(_,i)=>[i*3.6,52,30])};
 const before=structuredClone(raw);const feed=await readAuroraResponse({ok:true,json:async()=>raw});assert.equal(feed.forecastAt,'2026-10-09T14:30:00.000Z');assert.deepEqual(feed.cells,raw.cells);assert.deepEqual(raw,before);
});
test('Aurora network errors and timeouts receive safe actionable messages',()=>{
 assert.match(auroraFailureMessage(new TypeError('Failed to fetch QA')),/aurora feed is temporarily unavailable/);assert.match(auroraFailureMessage(undefined),/aurora feed is temporarily unavailable/);assert.equal(auroraFailureMessage(new DOMException('Aborted','AbortError')),'Aurora request timed out. Please retry.');assert.equal(auroraFailureMessage(new Error('Aurora response is unreadable. Please retry.')),'Aurora response is unreadable. Please retry.');
});
