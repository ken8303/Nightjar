import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {createCameraLocation}=await vite.ssrLoadModule('/lib/camera-location.ts');
function harness(){
 const state={pending:[],sites:[],errors:0},requests=[];
 const session=createCameraLocation({onPending:value=>state.pending.push(value),onSite:site=>state.sites.push(site),onError:()=>state.errors++});
 const start=()=>session.start((success,failure)=>requests.push({success,failure}));
 const position=(latitude=51.5,longitude=-.1)=>({coords:{latitude,longitude}});
 return {state,requests,session,start,position};
}
test('keeping the displayed site ignores late success and failure without altering UI',()=>{
 const h=harness();h.start();h.session.cancel();const count=h.state.pending.length;
 h.requests[0].success(h.position());h.requests[0].failure({});
 assert.equal(h.state.pending.length,count);assert.deepEqual(h.state.sites,[]);assert.equal(h.state.errors,0);assert.equal(h.state.pending.at(-1),false);
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
