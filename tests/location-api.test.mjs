import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {GET}=await vite.ssrLoadModule('/app/api/locations/route.ts');
test('invalid town searches do not contact the provider and names retain literal punctuation',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(new URL(url).searchParams.get('name'),'A&B + village');assert(options.signal);return Response.json({results:[]})};
 try{for(const query of ['', ' ', 'A', 'x'.repeat(101)]){const response=await GET(new Request('https://nightjar.test/api/locations?q='+encodeURIComponent(query)));assert.deepEqual(await response.json(),{results:[]})}assert.equal(calls,0);const response=await GET(new Request('https://nightjar.test/api/locations?q='+encodeURIComponent(' A&B + village ')));assert.equal(response.status,200);assert.deepEqual(await response.json(),{results:[]});assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('failed or unreadable location responses return a recoverable public error',async()=>{
 const original=globalThis.fetch;
 try{for(const provider of [async()=>new Response('private upstream error',{status:503}),async()=>new Response('{'),async()=>{throw Error('private network error')}]){globalThis.fetch=provider;const response=await GET(new Request('https://nightjar.test/api/locations?q=London'));assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'Location search is unavailable. Try your device location or coordinates.'})}}finally{globalThis.fetch=original}
});
