import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {lightPollutionCell:cell,decodeLightPollutionSample:decode,fetchLightPollutionSample:read,lightPollutionTileBytes:bytes}=await vite.ssrLoadModule('/lib/light-pollution-sample.ts');
const point=cell(51.4916,-.0714);
function tile(code=398){const data=new Uint8Array(bytes);data[0]=Math.round(code/128);data[1]=code-128*Math.round(code/128);return data}
const signal=()=>new AbortController().signal;
const fetcher=data=>async()=>new Response(data);

test('numeric cells use provider geometry and join date-line spellings',()=>{
 assert.deepEqual([point.tileX,point.tileY,point.x,point.y],[36,24,591,178]);
 assert.equal(point.url,'https://djlorenz.github.io/astronomy/binary_tiles/2025/binary_tile_36_24.dat.gz');
 assert.equal(cell(-65,-180).key,cell(-65,180).key);
 assert.deepEqual([cell(-65,-180).x,cell(-65,-180).y],[0,0]);
 assert.deepEqual([cell(74.999999,179.999999).tileX,cell(74.999999,179.999999).tileY,cell(74.999999,179.999999).x,cell(74.999999,179.999999).y],[72,28,599,599]);
 assert.deepEqual([cell(-60,-175).tileX,cell(-60,-175).tileY,cell(-60,-175).x,cell(-60,-175).y],[2,2,0,0]);
 assert.equal(cell(point.latitude,point.longitude).key,point.key);
 for(const [lat,lon] of [[75,0],[-65.001,0],[0,180.001],[NaN,0],[0,Infinity]])assert.equal(cell(lat,lon),null);
});
test('published reference readout agrees with decoded code and magnitude',()=>{
 // Provider UI popup, 19 October 2026: 51.4916,-0.0714; 2025;
 // LP 60.2, zone 7b, total 17.53. Its real tile independently decoded to 398.
 const sample=decode(tile(),point);
 assert.equal(sample.ratio.toFixed(1),'60.2');assert.equal(sample.magnitude.toFixed(2),'17.53');assert.equal(sample.zone,'7b');
 assert.ok(Math.abs(sample.ratio-60.16027391600993)<1e-10);
 assert.deepEqual(decode(tile(0),point),{ratio:0,magnitude:22,zone:'0',color:'#000000',latitude:point.latitude,longitude:point.longitude});
});
test('signed row starts and horizontal deltas are decoded independently',()=>{
 const data=tile(100);data[601]=256-5;data[1201]=7;data[1202]=256-9;data[1203]=3;
 // row 2 start = 100 - 5 + 7; column 2 = start - 9 + 3 = 96.
 const sample=decode(data,{...point,x:2,y:2});
 assert.ok(Math.abs(sample.ratio-5/195*Math.expm1(.0195*96))<1e-12);
 // Horizontal changes in row 0 must not change later row anchors.
 data[2]=100;assert.equal(decode(data,{...point,x:2,y:2}).ratio,sample.ratio);
 for(const bad of [tile(-1),new Uint8Array(bytes-1),new Uint8Array(bytes+1)])assert.throws(()=>decode(bad,point));
 for(const x of [-1,600,.5,NaN])assert.throws(()=>decode(data,{...point,x}));
});
test('one bounded gzip fetch omits credentials and precise coordinates',async()=>{
 let requested,options;const result=await read(point,{signal:signal(),fetcher:async(url,init)=>{requested=url;options=init;return new Response(gzipSync(tile()))}});
 assert.equal(requested,point.url);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(result.magnitude.toFixed(2),'17.53');
});
test('network, malformed, truncated and oversized data never become a darkness reading',async()=>{
 for(const data of [new Uint8Array([1,2,3]),gzipSync(tile()).subarray(0,20),gzipSync(new Uint8Array(bytes-1)),gzipSync(new Uint8Array(bytes+1)),new Uint8Array(512*1024+1)])await assert.rejects(read(point,{signal:signal(),fetcher:fetcher(data)}));
 const badCRC=gzipSync(tile());badCRC[badCRC.length-8]^=1;
 await assert.rejects(read(point,{signal:signal(),fetcher:fetcher(badCRC)}));
 await assert.rejects(read(point,{signal:signal(),fetcher:async()=>new Response('no',{status:503})}),/provider/);
 await assert.rejects(read(point,{signal:signal(),fetcher:async()=>new Response(null)}),/no model data/);
 await assert.rejects(read(point,{signal:signal(),fetcher:async()=>{throw new TypeError('Failed to fetch')}}),/Reconnect/);
});
test('non-success responses retire their body without reading a tile',async()=>{
 let cancelled=false;await assert.rejects(read(point,{signal:signal(),fetcher:async()=>new Response(new ReadableStream({cancel(){cancelled=true}}),{status:503})}),/provider/);assert.equal(cancelled,true);
});
test('abort before request avoids network; abort during read cancels the stream',async()=>{
 const first=new AbortController();first.abort();let called=false;
 await assert.rejects(read(point,{signal:first.signal,fetcher:async()=>{called=true;return new Response()}}));assert.equal(called,false);
 const controller=new AbortController();let cancelled=false;
 const pending=read(point,{signal:controller.signal,fetcher:async()=>new Response(new ReadableStream({start(){queueMicrotask(()=>controller.abort())},cancel(){cancelled=true}}))});
 await assert.rejects(pending);assert.equal(cancelled,true);
});
test('timeout bounds a stalled stream and cleans up its reader',async()=>{
 let cancelled=false;
 await assert.rejects(read(point,{signal:signal(),timeoutMs:10,fetcher:async()=>new Response(new ReadableStream({cancel(){cancelled=true}}))}),/timed out/);
 assert.equal(cancelled,true);
});
test('unsupported browsers get an actionable fallback without fetching',async()=>{
 const native=globalThis.DecompressionStream;let called=false;
 try{globalThis.DecompressionStream=undefined;await assert.rejects(read(point,{signal:signal(),fetcher:async()=>{called=true;return new Response()}}),/source atlas/);assert.equal(called,false)}finally{globalThis.DecompressionStream=native}
});
