import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {rateObservingSite,SiteRatingReadError}=await vite.ssrLoadModule('/lib/site-rating.ts');
const current={name:'Original site',latitude:51.5,longitude:0,country:'United Kingdom',timezone:'Europe/London',bortle:4};
function fixture(places=[current],selected=current){const values=new Map([['nightjar-places',JSON.stringify(places)]]);if(selected!==null)values.set('nightjar-place',JSON.stringify(selected));const writes=[];return {values,writes,getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes.push([key,value]);values.set(key,value)},removeItem:key=>values.delete(key)}}
test('rating changes keep latest same-site metadata, aliases and unrelated settings without mutating inputs',()=>{
 const selected={...current,name:'Newer name',country:'Newer country',timezone:'UTC',extra:'Selected peer'},alias={...current,name:'Alias',country:'Alias country',extra:'Alias peer'},other={...current,name:'Other site',latitude:48},store=fixture([alias,other],selected),before=structuredClone(current);
 const result=rateObservingSite(store,current,2);
 assert.deepEqual(result.place,{...selected,bortle:2});assert.deepEqual(result.places,[{...alias,bortle:2},other]);assert.deepEqual(current,before);
 assert.deepEqual(JSON.parse(store.getItem('nightjar-place')),{...selected,bortle:2});assert.equal(JSON.parse(store.getItem('nightjar-places'))[0].extra,'Alias peer');
 const cleared=fixture([current],{name:current.name,latitude:current.latitude,longitude:current.longitude});
 const clearResult=rateObservingSite(cleared,current,undefined);assert.equal(clearResult.place.country,undefined);assert.equal(clearResult.place.timezone,undefined);assert(!Object.hasOwn(JSON.parse(cleared.getItem('nightjar-place')),'bortle'));
});
test('missing selected sites can be rated but malformed sources, invalid ratings and changed coordinates make zero writes',()=>{
 const fresh=fixture([],null);assert.equal(rateObservingSite(fresh,current,3).place.bortle,3);assert.deepEqual(JSON.parse(fresh.getItem('nightjar-places')),[]);
 for(const value of [0,10,2.5,NaN,'2']){const store=fixture();assert.throws(()=>rateObservingSite(store,current,value));assert.equal(store.writes.length,0)}
 for(const [key,scope] of [['nightjar-place','selected'],['nightjar-places','places']])for(const raw of ['', '{', 'null']){
  const store=fixture();store.values.set(key,raw);assert.throws(()=>rateObservingSite(store,current,2),error=>error instanceof SiteRatingReadError&&error.scope===scope);assert.equal(store.writes.length,0);assert.equal(store.getItem(key),raw);
 }
 const peer=fixture([current],{...current,latitude:48});assert.throws(()=>rateObservingSite(peer,current,2),/changed elsewhere/);assert.equal(peer.writes.length,0);
});
test('rating write failures before or after each replacement restore originals and missing keys',()=>{
 for(const afterWrite of [false,true])for(const failAt of [1,2]){
  const store=fixture(),before=new Map(store.values),write=store.setItem;let calls=0;
  store.setItem=(key,value)=>{calls++;if(calls===failAt&&!afterWrite)throw Error('Denied');write(key,value);if(calls===failAt&&afterWrite)throw Error('Denied after write')};
  assert.throws(()=>rateObservingSite(store,current,1),/original settings were kept/);assert.deepEqual(store.values,before);
 }
 const missing=fixture([],null),before=new Map(missing.values),write=missing.setItem;let failed=false;
 missing.setItem=(key,value)=>{write(key,value);if(!failed){failed=true;throw Error('After write')}};
 assert.throws(()=>rateObservingSite(missing,current,1));assert.deepEqual(missing.values,before);
});
test('changes before and during rating writes retain peer selections and roll back only matching writes',()=>{
 const peer={...current,name:'Peer site',latitude:48,extra:'Keep peer'},store=fixture(),originalList=store.getItem('nightjar-places'),write=store.setItem;
 store.setItem=(key,value)=>{write(key,value);if(key==='nightjar-places')store.values.set('nightjar-place',JSON.stringify(peer))};
 assert.throws(()=>rateObservingSite(store,current,2),/changed during saving/);assert.equal(store.getItem('nightjar-places'),originalList);assert.deepEqual(JSON.parse(store.getItem('nightjar-place')),peer);
 const early=fixture(),read=early.getItem;let reads=0;
 early.getItem=key=>{const result=read(key);if(key==='nightjar-place'&&++reads===1)early.values.set(key,JSON.stringify(peer));return result};
 assert.throws(()=>rateObservingSite(early,current,2),/changed during saving/);assert.equal(early.writes.length,0);assert.deepEqual(JSON.parse(early.getItem('nightjar-place')),peer);
 const failed=fixture(),before=failed.getItem('nightjar-places'),replace=failed.setItem;
 failed.setItem=(key,value)=>{replace(key,value);if(key==='nightjar-place'){failed.values.set(key,JSON.stringify(peer));throw Error('Peer write')}};
 assert.throws(()=>rateObservingSite(failed,current,2),/Some changes may remain/);assert.equal(failed.getItem('nightjar-places'),before);assert.deepEqual(JSON.parse(failed.getItem('nightjar-place')),peer);
});
