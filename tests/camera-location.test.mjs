import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {createCameraLocation,cameraLocationFixLabel}=await vite.ssrLoadModule('/lib/camera-location.ts');
function harness(){
 const state={pending:[],sites:[],fixes:[],errors:0},requests=[];
 const session=createCameraLocation({onPending:value=>state.pending.push(value),onSite:(site,fix)=>{state.sites.push(site);state.fixes.push(fix)},onError:()=>state.errors++});
 const start=()=>session.start((success,failure)=>requests.push({success,failure}));
 const position=(latitude=51.5,longitude=-.1)=>({coords:{latitude,longitude}});
 return {state,requests,session,start,position};
}
test('keeping the displayed site ignores late success and failure without altering UI',()=>{
 const h=harness();h.start();h.session.cancel();const count=h.state.pending.length;
 h.requests[0].success(h.position());h.requests[0].failure({});
 assert.equal(h.state.pending.length,count);assert.deepEqual(h.state.sites,[]);assert.equal(h.state.errors,0);assert.equal(h.state.pending.at(-1),false);
});
test('the device fix preserves source timestamp and accuracy separately from site coordinates',()=>{
 const h=harness(),timestamp=Date.parse('2026-10-20T08:30:59.987Z'),position={...h.position(),timestamp};position.coords.accuracy=35.25;
 const before=structuredClone(position);h.start();h.requests[0].success(position);
 assert.deepEqual(h.state.fixes,[{accuracyMetres:35.25,timestamp}]);assert.deepEqual(h.state.sites,[{name:'Current device location',latitude:51.5,longitude:-.1}]);assert.deepEqual(position,before);
 assert.equal(cameraLocationFixLabel(h.state.fixes[0]),'Device fix time: 2026-10-20 08:30:59.987 UTC · reported horizontal accuracy: about 36 m.');
});
test('missing, malformed or unrepresentable fix metadata remains explicitly unavailable without losing a valid site',()=>{
 for(const [accuracy,timestamp] of [[undefined,undefined],[null,null],[-1,-1],[NaN,NaN],[Infinity,Infinity],[1e100,Date.parse('+010000-01-01T00:00:00Z')],['35','2026-10-20']]){
  const h=harness();h.start();h.requests[0].success({...h.position(),timestamp,coords:{...h.position().coords,accuracy}});
  assert.equal(h.state.sites.length,1);assert.deepEqual(h.state.fixes,[{accuracyMetres:null,timestamp:null}]);assert.equal(h.state.errors,0);
  assert.equal(cameraLocationFixLabel(h.state.fixes[0]),'Device fix time: unavailable · reported horizontal accuracy: unavailable.');
 }
});
test('accuracy and timestamp fail independently and zero values are preserved as reported',()=>{
 const h=harness();h.start();h.requests[0].success({...h.position(),timestamp:0,coords:{...h.position().coords,accuracy:0}});
 assert.deepEqual(h.state.fixes,[{accuracyMetres:0,timestamp:0}]);assert(cameraLocationFixLabel(h.state.fixes[0]).includes('1970-01-01 00:00:00.000 UTC'));assert(cameraLocationFixLabel(h.state.fixes[0]).includes('about 0 m'));
 for(const [accuracy,timestamp,expected] of [[10,NaN,{accuracyMetres:10,timestamp:null}],[NaN,1000,{accuracyMetres:null,timestamp:1000}]]){
  h.start();h.requests.at(-1).success({...h.position(),timestamp,coords:{...h.position().coords,accuracy}});assert.deepEqual(h.state.fixes.at(-1),expected);
 }
 assert(cameraLocationFixLabel({accuracyMetres:2500,timestamp:null}).includes('about 2.5 km'));
});
test('cancelled and superseded callbacks cannot publish stale fix quality or timestamps',()=>{
 const h=harness(),position=(accuracy,timestamp)=>({...h.position(),timestamp,coords:{...h.position().coords,accuracy}});
 h.start();h.session.cancel();h.requests[0].success(position(1,1000));assert.deepEqual(h.state.fixes,[]);
 h.start();h.start();h.requests[1].success(position(2,2000));assert.deepEqual(h.state.fixes,[]);
 h.requests[2].success(position(3,3000));h.requests[2].success(position(4,4000));assert.deepEqual(h.state.fixes,[{accuracyMetres:3,timestamp:3000}]);
});
test('new requests supersede older requests and only complete once',()=>{
 const h=harness();h.start();h.start();h.requests[0].failure({});h.requests[0].success(h.position());
 assert.equal(h.state.pending.at(-1),true);assert.equal(h.state.errors,0);
 h.requests[1].success(h.position(0,180));h.requests[1].success(h.position());h.requests[1].failure({});
 assert.deepEqual(h.state.sites,[{name:'Current device location',latitude:0,longitude:180}]);assert.equal(h.state.pending.at(-1),false);assert.equal(h.state.errors,0);
});
test('disposal invalidates callbacks without updating unmounted state',()=>{
 const h=harness();h.start();h.session.cancel(false);const count=h.state.pending.length;
 h.requests[0].success(h.position());h.requests[0].failure({});assert.equal(h.state.pending.length,count);assert.equal(h.state.sites.length,0);assert.equal(h.state.errors,0);
});
test('invalid coordinates, provider failure and synchronous exceptions offer recovery',()=>{
 const h=harness();
 for(const [latitude,longitude] of [[NaN,0],[91,0],[0,Infinity],[0,-181]]){h.start();h.requests.at(-1).success(h.position(latitude,longitude))}
 h.start();h.requests.at(-1).failure({});h.session.start(()=>{throw Error('Unavailable')});
 assert.equal(h.state.errors,6);assert.equal(h.state.sites.length,0);assert.equal(h.state.pending.at(-1),false);
 h.start();h.requests.at(-1).success(h.position(-90,-180));assert.equal(h.state.sites.length,1);
});
