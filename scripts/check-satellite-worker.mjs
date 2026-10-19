import {createRequire} from 'node:module';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {stageCloudflareBuild} from './stage-cloudflare-build.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker} from 'node:worker_threads';
const repo=fileURLToPath(new URL('../',import.meta.url));
const req=createRequire(repo+'/package.json'),wranglerReq=createRequire(req.resolve('wrangler/package.json'));
const {Miniflare,Response:RuntimeResponse}=wranglerReq('miniflare');
const stage=await stageCloudflareBuild(repo+'/dist'),root=await mkdtemp(join(tmpdir(),'nightjar-orbital-runtime-'));
const [frozen]=JSON.parse(await readFile(repo+'/tests/fixtures/iss-2026-10-19.json','utf8'));
const fixture={...frozen,EPOCH:new Date(Date.now()-3600000).toISOString().slice(0,-1)};
const server=stage.root+'/server';
const modulePaths=(await readdir(server,{recursive:true})).filter(name=>/\.m?js$/.test(name)&&name!=='index.js');
const modules=['index.js',...modulePaths].map(name=>({type:'ESModule',path:join(server,name)}));
let calls=0,mf;
// Frozen orbital fields receive a synthetic current epoch for cache protocol
// checks only. Numerical accuracy uses separate published reference vectors.
const options={name:'nightjar-satellite-check',modules,modulesRoot:stage.root+'/server',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],cf:false,assets:{directory:stage.root+'/client',binding:'ASSETS',workerName:'nightjar-satellite-check',routerConfig:{has_user_worker:true}},durableObjects:{SATELLITE_FEED:{className:'SatelliteCoordinator',useSQLite:true}},durableObjectsPersist:root+'/success',outboundService:async request=>{calls++;assert.equal(request.url,'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON');return new RuntimeResponse(JSON.stringify([fixture]),{headers:{'Content-Type':'application/json'}})}};
async function checkPassWorker(){
 const client=stage.root+'/client',names=await readdir(client,{recursive:true});
 const entries=names.filter(name=>/(?:^|\/)satellite-pass\.worker-[^/]+\.js$/.test(name));assert.equal(entries.length,1,'one emitted pass worker');
 const url='/'+entries[0],linked=[];
 for(const name of names.filter(name=>/\.js$/.test(name)&&name!==entries[0])){
  const source=await readFile(join(client,name),'utf8');
  if(source.includes(url)){
   assert(!/new Worker\(new URL\([^)]*file:/.test(source),'a pass worker must not resolve relative to a build-time file URL');linked.push(name);
  }
 }
 assert(linked.length>0,'the client must reference its emitted pass worker');
 const response=await mf.dispatchFetch('https://nightjar.test'+url);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/javascript/);assert.equal(await response.text(),await readFile(join(client,entries[0]),'utf8'));
 // Execute the emitted computation with a minimal Web Worker message bridge.
 // Browser construction, cancellation and responsive rendering remain separate QA.
 const bridge=`import {parentPort} from 'node:worker_threads';globalThis.self=globalThis;self.postMessage=value=>parentPort.postMessage(value);await import(${JSON.stringify(pathToFileURL(join(client,entries[0])).href)});parentPort.on('message',data=>self.onmessage({data}));`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(bridge)));
 try{
  const result=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Compiled pass worker timed out')),15000);
   worker.once('error',error=>{clearTimeout(timeout);reject(error)});
   worker.once('message',value=>{clearTimeout(timeout);resolve(value)});
   worker.postMessage({elements:frozen,start:Date.parse('2026-10-19T12:00:00Z'),latitude:51.5,longitude:-.1257});
  });
  assert(!result.error);assert.equal(result.result.passes.length,6);assert.equal(result.result.end-result.result.start,86400000);
  assert(Math.abs(result.result.passes[0].maximumAltitude-1.26606)<.001);
  assert.equal(result.result.passes[0].lighting.sunlight,'earth-shadow');
  assert.equal(result.result.passes[2].lighting.sunlight,'sunlit');
  assert(result.result.passes[2].lighting.sunAltitude< -6);
 }finally{await worker.terminate()}
}
try{
 mf=new Miniflare(options);await mf.ready;
 const replies=await Promise.all(Array.from({length:12},()=>mf.dispatchFetch('https://nightjar.test/api/satellite?object=25544')));
 const bodies=await Promise.all(replies.map(async response=>{if(response.status!==200)throw Error(JSON.stringify({status:response.status,body:await response.text(),calls}));return response.json()}));
 assert.equal(calls,1);assert(bodies.every(body=>body.elements.NORAD_CAT_ID===25544&&body.fetchedAt===bodies[0].fetchedAt));
 for(const [url,method,status] of [['/api/satellite','GET',400],['/api/satellite?object=5','GET',400],['/api/satellite?object=25544&object=25544','GET',400],['/api/satellite?object=25544','POST',405]])assert.equal((await mf.dispatchFetch('https://nightjar.test'+url,{method})).status,status);
 const page=await mf.dispatchFetch('https://nightjar.test/');assert.equal(page.status,200);assert((await page.text()).includes('Nightjar'));
 const offline=await mf.dispatchFetch('https://nightjar.test/offline');assert.equal(offline.status,200);
 await checkPassWorker();
 await mf.dispose();mf=new Miniflare(options);await mf.ready;
 const restored=await (await mf.dispatchFetch('https://nightjar.test/api/satellite?object=25544')).json();assert.equal(calls,1);assert.equal(restored.fetchedAt,bodies[0].fetchedAt);
 await mf.dispose();mf=new Miniflare({...options,durableObjectsPersist:root+'/halted',outboundService:async()=>{calls++;return new RuntimeResponse('No',{status:403})}});await mf.ready;
 assert.equal((await mf.dispatchFetch('https://nightjar.test/api/satellite?object=25544')).status,503);const failedCount=calls;
 await mf.dispose();mf=new Miniflare({...options,durableObjectsPersist:root+'/halted'});await mf.ready;
 const halted=await mf.dispatchFetch('https://nightjar.test/api/satellite?object=25544');assert.equal(halted.status,503);assert.match((await halted.json()).error,/403/);assert.equal(calls,failedCount);
 console.log(JSON.stringify({concurrentRequests:12,sharedSourceRequests:1,restartTimestamp:'preserved',http403Latch:'persists after restart',badQueries:'rejected',appAndOffline:'pass',passWorker:'linked, served and executed',liveNetworkRequests:0}));
}finally{await mf?.dispose();await stage.cleanup();await rm(root,{recursive:true,force:true})}
