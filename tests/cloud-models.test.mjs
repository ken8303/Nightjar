import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseCloudModels,parseCloudModelResponse,cloudModelsAt}=await vite.ssrLoadModule('/lib/cloud-models.ts');
const {GET}=await vite.ssrLoadModule('/app/api/cloud-models/route.ts');
const fixture=()=>({hourly_units:{time:'unixtime',cloud_cover_gfs_global:'%',cloud_cover_icon_global:'%',cloud_cover_ecmwf_ifs025:'%'},hourly:{time:[1793059200,1793062800],cloud_cover_gfs_global:[0,80],cloud_cover_icon_global:[45,null],cloud_cover_ecmwf_ifs025:[35,95]}});
test('model comparison aligns the selected hour and keeps missing and invalid values unavailable',()=>{
 const data=parseCloudModels(fixture());assert.deepEqual(cloudModelsAt(data,new Date(1793060000*1000)),{gfs:0,icon:45,ecmwf:35});assert.deepEqual(cloudModelsAt(data,new Date(1793062800*1000)),{gfs:80,icon:null,ecmwf:95});assert.equal(cloudModelsAt(data,new Date(1793066400*1000)),null);
 const partial=fixture();delete partial.hourly.cloud_cover_icon_global;delete partial.hourly.cloud_cover_ecmwf_ifs025;partial.hourly.cloud_cover_gfs_global=[-1,101];assert.deepEqual(parseCloudModels(partial).gfs,[null,null]);assert.deepEqual(parseCloudModels(partial).icon,[null,null]);assert.deepEqual(parseCloudModels(partial).ecmwf,[null,null]);assert.deepEqual(parseCloudModelResponse(data),data);
 assert.deepEqual(parseCloudModelResponse({time:data.time,gfs:data.gfs,icon:data.icon}).ecmwf,[null,null]);
 for(const change of [f=>{f.hourly.time=[1,1]},f=>{f.hourly_units.time='iso8601'},f=>{f.hourly_units.cloud_cover_gfs_global='K'},f=>{f.hourly.cloud_cover_icon_global=[20]},f=>{f.hourly_units.cloud_cover_ecmwf_ifs025='K'},f=>{f.hourly.cloud_cover_ecmwf_ifs025=[20]}]){const f=fixture();change(f);assert.throws(()=>parseCloudModels(f))}
 assert.throws(()=>parseCloudModelResponse({time:[1793059200],gfs:[]}));
});
test('model endpoint validates site, uses named global models and hides upstream failures',async()=>{
 const original=globalThis.fetch;let calls=0;try{
  globalThis.fetch=async(url,options)=>{calls++;const endpoint=new URL(url);assert.equal(endpoint.searchParams.get('models'),'gfs_global,icon_global,ecmwf_ifs025');assert.equal(endpoint.searchParams.get('latitude'),'51.5');assert(options.signal);return Response.json(fixture())};
  assert.equal((await GET(new Request('https://nightjar.test/api/cloud-models?lat=91&lon=0'))).status,400);assert.equal(calls,0);
  const result=await GET(new Request('https://nightjar.test/api/cloud-models?lat=51.5&lon=0'));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.deepEqual(await result.json(),parseCloudModels(fixture()));
  globalThis.fetch=async()=>new Response('private upstream detail',{status:503});const error=await GET(new Request('https://nightjar.test/api/cloud-models?lat=51.5&lon=0'));assert.equal(error.status,502);assert(!JSON.stringify(await error.json()).includes('private'));
 }finally{globalThis.fetch=original}
});
