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
test('opposite longitude signs at the date line retain the existing coordinate tolerance',()=>{
 const east={...saved,latitude:-17.75,longitude:180},west={...east,longitude:-180};
 assert(samePlaceCoordinates(east,west));assert(samePlaceCoordinates(west,east));
 assert(samePlaceCoordinates({...east,longitude:179.99999},{...west,longitude:-179.99999}));
 assert(!samePlaceCoordinates(east,{...west,longitude:-179.999}));
 assert(!samePlaceCoordinates(east,{...west,latitude:east.latitude+.001}));
 assert(!samePlaceCoordinates(east,{...west,longitude:0}));
});
test('date-line coordinate selection recovers known metadata without changing the entered longitude or borrowing ambiguous aliases',()=>{
 const east={name:'Dateline QA',latitude:-17.75,longitude:180,timezone:'Pacific/Fiji',country:'QA country',bortle:3},west={name:'Coordinates',latitude:-17.75,longitude:-180};
 assert.deepEqual(resolveObservingPlace(west,[east]),{...west,timezone:east.timezone,country:east.country,bortle:3});
 const other={...west,name:'Second alias',timezone:'UTC',country:'Other QA country',bortle:7};
 const ambiguous=resolveObservingPlace(west,[east,other],east);assert.equal(ambiguous.bortle,undefined);assert.equal(ambiguous.timezone,undefined);
 assert.deepEqual(resolveObservingPlace({...west,name:other.name},[east,other],east),other);
});
test('invalid selected coordinates or time zones cannot replace valid observing context',()=>{
 for(const patch of [{latitude:91},{longitude:Infinity},{timezone:'Not/AZone'},{name:''}])assert.throws(()=>resolveObservingPlace({...saved,...patch},[saved]),/Invalid observing place/);
});

test('choosing a named coordinate alias does not inherit a sibling rating or cleared metadata',()=>{
 const roof={name:'Unrated roof',latitude:saved.latitude,longitude:saved.longitude},before=structuredClone([saved,roof]);
 const result=resolveObservingPlace(roof,[saved,roof],saved);
 assert.equal(result.name,roof.name);assert.equal(result.bortle,undefined);assert.equal(result.country,undefined);assert.equal(result.timezone,undefined);
 assert.deepEqual([saved,roof],before);
 const rated={...roof,bortle:7,timezone:'UTC',country:'Roof country'};
 assert.deepEqual(resolveObservingPlace(roof,[saved,rated],saved),rated);
});

test('ambiguous coordinate aliases do not invent metadata for an unrelated or duplicate name',()=>{
 const other={...saved,name:'Second alias',bortle:8,timezone:'UTC'},candidate={name:'Coordinate search',latitude:saved.latitude,longitude:saved.longitude};
 const result=resolveObservingPlace(candidate,[saved,other],saved);
 assert.equal(result.bortle,undefined);assert.equal(result.country,undefined);assert.equal(result.timezone,undefined);
 const duplicate={...saved,bortle:8,timezone:'UTC'},requested={...candidate,name:saved.name};
 const ambiguous=resolveObservingPlace(requested,[saved,duplicate],saved);
 assert.equal(ambiguous.bortle,undefined);assert.equal(ambiguous.country,undefined);assert.equal(ambiguous.timezone,undefined);
 const explicit={...candidate,bortle:3,timezone:'Europe/London'};assert.equal(resolveObservingPlace(explicit,[saved,other],saved).bortle,3);
});
