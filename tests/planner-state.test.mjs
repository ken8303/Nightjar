import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {resolveObservingPlace,samePlaceCoordinates}=await vite.ssrLoadModule('/lib/planner-state.ts');
const saved={name:'Saved London',latitude:51.5085,longitude:-.1257,country:'United Kingdom',timezone:'Europe/London',bortle:4};
test('coordinate-only selection recovers saved metadata without replacing the requested name',()=>{
 const candidate={name:'London',latitude:51.5085,longitude:-.1257},snapshot=structuredClone(saved);
 assert.deepEqual(resolveObservingPlace(candidate,[saved]),{...candidate,country:'United Kingdom',timezone:'Europe/London',bortle:4});assert.deepEqual(saved,snapshot);assert.equal(candidate.timezone,undefined);
 const supplied={...candidate,country:'Explicit country',timezone:'UTC',bortle:2};assert.deepEqual(resolveObservingPlace(supplied,[saved]),supplied);
});
test('metadata never leaks between different sites and missing saved fields can use matching current context',()=>{
 const candidate={name:'Selected',latitude:0,longitude:0},result=resolveObservingPlace(candidate,[saved],saved);assert.equal(result.timezone,undefined);assert.equal(result.bortle,undefined);assert.equal(result.country,undefined);
 assert.deepEqual(resolveObservingPlace({...saved,name:'Selected',timezone:undefined},[{...saved,timezone:undefined}],saved),{...saved,name:'Selected'});
 assert(samePlaceCoordinates(saved,{...saved,latitude:saved.latitude+.00001}));assert(!samePlaceCoordinates(saved,{...saved,latitude:saved.latitude+.001}));
});
test('invalid selected coordinates or time zones cannot replace valid observing context',()=>{
 for(const patch of [{latitude:91},{longitude:Infinity},{timezone:'Not/AZone'},{name:''}])assert.throws(()=>resolveObservingPlace({...saved,...patch},[saved]),/Invalid observing place/);
});
