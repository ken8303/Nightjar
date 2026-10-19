import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseOrbitElements:parse,parseOrbitalEpoch:epoch,parseSatelliteFeed,satelliteRefreshMs:cadence,satelliteEpochWindowMs:windowMs}=await vite.ssrLoadModule('/lib/satellite-elements.ts');
const {satelliteState,satelliteHorizontal,satelliteDataIssue}=await vite.ssrLoadModule('/lib/satellite-position.ts');
const {SatelliteFeedCache:Cache,satelliteCacheKey:key}=await vite.ssrLoadModule('/lib/satellite-feed-cache.ts');
const [raw]=JSON.parse(await readFile(new URL('fixtures/iss-2026-10-19.json',import.meta.url),'utf8'));
const elements=parse(raw,25544),time=+epoch(raw.EPOCH)+3600000;
const close=(a,b,tolerance)=>assert(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);
const store=()=>({data:new Map(),async get(name){return structuredClone(this.data.get(name))},async put(name,value){this.data.set(name,structuredClone(value))}});
const success=()=>new Response(JSON.stringify([raw]));
const feed=()=>({version:1,elements,fetchedAt:new Date(time).toISOString(),nextRefreshAt:new Date(time+cadence).toISOString(),refreshPaused:false,issue:''});

test('OMM epochs are strict UTC with omitted designators and fractional seconds',()=>{
 assert.equal(epoch(raw.EPOCH).toISOString(),'2026-10-19T04:14:45.011Z');assert.equal(+epoch(raw.EPOCH+'Z'),+epoch(raw.EPOCH));
 for(const value of ['2026-02-30T00:00:00','2026-01-01T00:00:60','2026-01-01 00:00:00','2026-01-01T00:00:00+01:00','1956-01-01T00:00:00','2026-01-01T00:00:00.',null])assert.equal(epoch(value),null);
});
test('GP compact defaults retain nine-digit identities while rejecting wrong frames and unsupported data',()=>{
 assert.equal(elements.NORAD_CAT_ID,25544);assert.equal(parse({...raw,NORAD_CAT_ID:'123456789'}).NORAD_CAT_ID,123456789);
 assert.equal(parse({...raw,MEAN_MOTION:'15.48934931'}).MEAN_MOTION,raw.MEAN_MOTION);
 for(const patch of [{NORAD_CAT_ID:1000000000},{NORAD_CAT_ID:2.5},{MEAN_MOTION:''},{MEAN_MOTION:Infinity},{MEAN_MOTION:0},{ECCENTRICITY:1},{INCLINATION:181},{RA_OF_ASC_NODE:-1},{ARG_OF_PERICENTER:360},{BSTAR:null},{REF_FRAME:'J2000'},{CENTER_NAME:'MARS'},{TIME_SYSTEM:'TAI'},{MEAN_ELEMENT_THEORY:'SGP'},{EPHEMERIS_TYPE:2},{CCSDS_OMM_VERS:'2.0'}])assert.throws(()=>parse({...raw,...patch}));
 assert.throws(()=>parse({...raw,NORAD_CAT_ID:123456},25544),/identity/);
});
const vanguard=parse({OBJECT_NAME:'VANGUARD 1',OBJECT_ID:'1958-002B',NORAD_CAT_ID:5,EPOCH:'2000-06-27T18:50:19.733568',MEAN_MOTION:10.82419157,ECCENTRICITY:.1859667,INCLINATION:34.2682,RA_OF_ASC_NODE:348.7242,ARG_OF_PERICENTER:331.7664,MEAN_ANOMALY:19.3264,BSTAR:2.8098e-5,MEAN_MOTION_DOT:.00000023,MEAN_MOTION_DDOT:0,ELEMENT_SET_NO:475});
test('OMM propagation matches published Vallado 2006 verification vectors in TEME kilometres',()=>{
 // CelesTrak AIAA-2006-6753 source archive: SGP4-VER.TLE object 00005
 // and tforverf.out. This is Vanguard, never relabelled as the ISS.
 const vectors=[
 [0,[7022.46529266,-1400.08296755,.03995155],[1.893841015,6.405893759,4.534807250]],
 [360,[-7154.03120202,-3783.17682504,-3536.19412294],[4.741887409,-4.151817765,-2.093935425]],
 [720,[-7134.59340119,6531.68641334,3260.27186483],[-4.113793027,-2.911922039,-2.557327851]],
 ];
 for(const [minutes,position,velocity] of vectors){const state=satelliteState(vanguard,new Date(+epoch(vanguard.EPOCH)+minutes*60000));assert(state);['x','y','z'].forEach((axis,index)=>{close(state.position[axis],position[index],.02);close(state.velocity[axis],velocity[index],.00002)})}
});
test('horizontal directions agree with independently transformed published vectors, including poles and the date line',()=>{
 // Independent Python WGS84 observer + IAU82 GMST rotation of the published
 // epoch vector; reference epoch is truncated to JS milliseconds explicitly.
 const expected=[[51.5,0,-59.3893290898272,36.34848997760458,11879.09464717922],[-17.75,180,-6.662010197553121,297.63885719457255,4074.4358463465437],[90,0,-41.596279537240136,30.04426186692162,9575.126274085353],[-90,0,-41.596637097079295,149.95573813307837,9575.17932015434]];
 for(const [lat,lon,alt,az,range] of expected){const point=satelliteHorizontal(vanguard,epoch(vanguard.EPOCH),lat,lon);assert(point);close(point.altitude,alt,.001);close(point.azimuth,az,.001);close(point.rangeKm,range,.03)}
 assert.deepEqual(satelliteHorizontal(vanguard,epoch(vanguard.EPOCH),-17.75,180),satelliteHorizontal(vanguard,epoch(vanguard.EPOCH),-17.75,-180));
 for(const [lat,lon] of [[NaN,0],[91,0],[0,181]])assert.equal(satelliteHorizontal(elements,new Date(time),lat,lon),null);
 assert.equal(satelliteState(elements,new Date(time+windowMs+1)),null);
 assert.equal(satelliteState({...elements,MEAN_MOTION:20,ECCENTRICITY:.5},new Date(time)),null);
});
test('freshness and selected-date gates distinguish stale data, future device clocks and distant dates',()=>{
 const f=feed();assert.equal(satelliteDataIssue(f,new Date(time),time),'');
 assert.match(satelliteDataIssue(f,new Date(time),time+6*3600000+1),/six hours/);
 assert.match(satelliteDataIssue(f,new Date(time),time-5*60000-1),/device/);
 assert.match(satelliteDataIssue(f,new Date(+epoch(elements.EPOCH)+windowMs+1),time),/observing time/);
 assert.match(satelliteDataIssue({...f,fetchedAt:new Date(time+4*86400000).toISOString()},new Date(time),time+4*86400000),/epoch/);
 assert.throws(()=>parseSatelliteFeed({...f,fetchedAt:'2026-02-30T00:00:00.000Z'}));
});
test('a shared refresh coalesces concurrent callers, returns independent bodies and preserves the successful timestamp',async()=>{
 const storage=store();let calls=0,now=time,release;
 const cache=new Cache(storage,async(url,init)=>{calls++;assert.equal(init.redirect,'manual');assert.equal(url,'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON');await new Promise(resolve=>{release=resolve});now+=1000;return success()},()=>now);
 const pending=Array.from({length:20},()=>cache.read());await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);release();const replies=await Promise.all(pending);const values=await Promise.all(replies.map(r=>r.json()));assert(values.every(value=>value.fetchedAt===new Date(time+1000).toISOString()));
 assert.equal((await (await cache.read()).json()).fetchedAt,values[0].fetchedAt);assert.equal(calls,1);
 const reloaded=new Cache(storage,async()=>{calls++;return success()},()=>time+cadence-1);await reloaded.read();assert.equal(calls,1);
 const expired=new Cache(storage,async()=>{calls++;return success()},()=>time+cadence);await expired.read();assert.equal(calls,2);
});
test('non-200 responses latch across restarts and later windows, including redirects',async()=>{
 for(const status of [301,403,500]){const storage=store();let calls=0;const failed=new Cache(storage,async()=>{calls++;return new Response('No',{status})},()=>time);const response=await failed.read();assert.equal(response.status,503);assert.equal(storage.data.get(key).halted,true);const later=new Cache(storage,async()=>{calls++;return success()},()=>time+10*cadence);await later.read();assert.equal(calls,1)}
});
test('network failures enforce cooldown while invalid bodies halt automatic refresh',async()=>{
 const storage=store();let calls=0;const failed=new Cache(storage,async()=>{calls++;throw Error('Network')},()=>time);await failed.read();assert.equal(storage.data.get(key).halted,false);
 await new Cache(storage,async()=>{calls++;return success()},()=>time+cadence-1).read();assert.equal(calls,1);
 await new Cache(storage,async()=>{calls++;return success()},()=>time+cadence).read();assert.equal(calls,2);
 for(const body of ['bad','[]',JSON.stringify([raw,raw]),JSON.stringify([{...raw,NORAD_CAT_ID:123456}]),'x'.repeat(16385)]){const s=store();const response=await new Cache(s,async()=>new Response(body),()=>time).read();assert.equal(response.status,503);assert.equal(s.data.get(key).halted,true)}
});
test('last good data keeps its original fetch time when a later provider error pauses refresh',async()=>{
 const storage=store();await new Cache(storage,async()=>success(),()=>time).read();
 const reply=await (await new Cache(storage,async()=>new Response('No',{status:403}),()=>time+cadence).read()).json();
 assert.equal(reply.fetchedAt,new Date(time).toISOString());assert.equal(reply.refreshPaused,true);assert.match(reply.issue,/403/);assert.deepEqual(reply.elements,elements);
});
test('storage failures never bypass the persisted pre-request fence',async()=>{
 for(const operation of ['get','put']){let calls=0;const storage=store();storage[operation]=async()=>{throw Error('Blocked')};assert.equal((await new Cache(storage,async()=>{calls++;return success()},()=>time).read()).status,503);assert.equal(calls,0)}
 const storage=store(),put=storage.put.bind(storage);let writes=0,calls=0;storage.put=async(...args)=>{if(++writes===2)throw Error('Post-response write failed');return put(...args)};
 assert.equal((await new Cache(storage,async()=>{calls++;return new Response('No',{status:403})},()=>time).read()).status,503);
 assert.equal(storage.data.get(key).halted,true);
 await new Cache(storage,async()=>{calls++;return success()},()=>time+5*cadence).read();assert.equal(calls,1);
});
test('corrupt state, backwards clocks and out-of-window source epochs cannot trigger repeated downloads',async()=>{
 const s=store();s.data.set(key,{version:1});let calls=0;await new Cache(s,async()=>{calls++;return success()},()=>time).read();assert.equal(calls,0);
 const good=store();await new Cache(good,async()=>success(),()=>time).read();await new Cache(good,async()=>{calls++;return success()},()=>time-1).read();assert.equal(calls,0);
 const stale=store();assert.equal((await new Cache(stale,async()=>success(),()=>time+4*86400000).read()).status,503);assert.equal(stale.data.get(key).halted,true);
});
test('an incomplete body respects the deadline and halts instead of publishing partial data',async()=>{
 const storage=store();let cancelled=false;
 const cache=new Cache(storage,async()=>new Response(new ReadableStream({cancel(){cancelled=true}})),()=>time,10);
 assert.equal((await cache.read()).status,503);assert.equal(cancelled,true);assert.equal(storage.data.get(key).halted,true);
});
