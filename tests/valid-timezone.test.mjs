import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {validTimeZone}=await vite.ssrLoadModule('/lib/valid-timezone.ts');
const {validPlace}=await vite.ssrLoadModule('/lib/planner-state.ts');
const {observingTimeZone}=await vite.ssrLoadModule('/lib/observing-time.ts');

test('cached zone validation agrees with the runtime for valid aliases and invalid inputs',()=>{
 for(const value of [undefined,null,0,{},'', 'UTC','Europe/London','europe/london','Etc/GMT+5','America/New_York','Pacific/Kiritimati','+01:00','Mars/Base','constructor','__proto__']){
  let expected=false;
  if(typeof value==='string')try{new Intl.DateTimeFormat('en',{timeZone:value});expected=true}catch{}
  assert.equal(validTimeZone(value),expected);
  assert.equal(validTimeZone(value),expected,'repeated reads keep the same acceptance');
  assert.deepEqual(observingTimeZone(value),expected?{zone:value,known:true}:{zone:'UTC',known:false});
 }
});

test('repeated site validation reuses zone checks without trusting changed record fields',()=>{
 const native=Intl.DateTimeFormat,zone='aUsTrAlIa/sYdNeY';let checks=0;
 Intl.DateTimeFormat=new Proxy(native,{construct(target,args,newTarget){if(args[1]?.timeZone===zone)checks++;return Reflect.construct(target,args,newTarget)}});
 try{
  const place={name:'Sydney',latitude:-33.8688,longitude:151.2093,timezone:zone};
  for(let i=0;i<200;i++){assert(validPlace(place));assert(observingTimeZone(zone).known)}
  assert.equal(checks,1);
  for(const patch of [{name:''},{latitude:91},{longitude:NaN},{bortle:10},{country:4},{timezone:{toString:()=>zone}}])assert.equal(validPlace({...place,...patch}),false);
  assert(validPlace({...place,name:'Different site',latitude:0}));
 }finally{Intl.DateTimeFormat=native}
});

test('invalid zones are cached, evicted safely and oversized names are not retained',()=>{
 const native=Intl.DateTimeFormat,zone='Invalid/Diary-cache-test',huge='Invalid/'+ 'x'.repeat(1000);let checks=0,hugeChecks=0;
 Intl.DateTimeFormat=new Proxy(native,{construct(target,args,newTarget){if(args[1]?.timeZone===zone)checks++;if(args[1]?.timeZone===huge)hugeChecks++;return Reflect.construct(target,args,newTarget)}});
 try{
  for(let i=0;i<200;i++)assert.equal(validTimeZone(zone),false);
  assert.equal(checks,1);
  for(let i=0;i<256;i++)assert.equal(validTimeZone(`Invalid/Cache-churn-${i}`),false);
  assert.equal(validTimeZone(zone),false);assert.equal(checks,2,'eviction requires validation again');
  assert.equal(validTimeZone(huge),false);assert.equal(validTimeZone(huge),false);assert.equal(hugeChecks,2);
  assert(validTimeZone('Europe/London'),'cache churn cannot change valid zone acceptance');
 }finally{Intl.DateTimeFormat=native}
});
