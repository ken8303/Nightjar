import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseAurora,validateAuroraFeed,nearestAurora,auroraIsStale,auroraTimingIssue}=await vite.ssrLoadModule('/lib/aurora.ts');
const now=new Date('2026-10-06T20:00:00Z'),cells=Array.from({length:100},(_,i)=>[i,60,20]);
const raw={'Observation Time':'2026-10-06T19:50:00Z','Forecast Time':'2026-10-06T20:30:00Z',coordinates:cells};
test('provider and browser aurora formats share valid cells and canonical timestamps',()=>{
 const feed=parseAurora(raw,now);assert.deepEqual(validateAuroraFeed(feed),{...feed,observedAt:'2026-10-06T19:50:00.000Z',forecastAt:'2026-10-06T20:30:00.000Z'});assert.equal(auroraIsStale(feed,+now),false);assert.equal(auroraIsStale(feed,+now+3*3600000),true);assert.deepEqual(nearestAurora([[359,60,10],[10,60,50]],60,-1),[359,60,10]);
});
test('malformed browser feeds are rejected before dates or grids reach rendering',()=>{
 const feed=parseAurora(raw,now);
 for(const value of [null,{},raw,{...feed,observedAt:'invalid'},{...feed,forecastAt:null},{...feed,fetchedAt:''},{...feed,cells:null},{...feed,cells:cells.slice(0,99)},{...feed,cells:[...cells,[0,91,20]]},{...feed,cells:[...cells,[0,60,101]]},{...feed,cells:[...cells,[NaN,60,20]]},{...feed,cells:Array(100001).fill([0,60,20])}])assert.throws(()=>validateAuroraFeed(value),/Please retry/);
});
test('provider parser excludes invalid cells and refuses an unusable or oversized grid',()=>{
 assert.equal(parseAurora({...raw,coordinates:[...cells,[361,60,10],['0',60,10]]},now).cells.length,100);
 assert.throws(()=>parseAurora({...raw,coordinates:[...cells.slice(0,99),[0,91,20]]},now));assert.throws(()=>parseAurora({...raw,coordinates:Array(100001).fill([0,60,20])},now));
});

test('aurora dates must be exact UTC calendar instants in chronological forecast order',()=>{
 for(const stamp of ['2026-02-30T20:00:00Z','2026-10-06T24:00:00Z','2026-10-06T20:00:00','2026-10-06T20:00:00+00:00','2026-10-06','0000-10-06T20:00:00Z','2026-10-06T20:00:00.1Z','x'.repeat(10000)]){
  assert.throws(()=>parseAurora({...raw,'Observation Time':stamp},now),/Invalid aurora/);assert.throws(()=>parseAurora({...raw,'Forecast Time':stamp},now),/Invalid aurora/);
  const feed=parseAurora(raw,now);for(const field of ['observedAt','forecastAt','fetchedAt'])assert.throws(()=>validateAuroraFeed({...feed,[field]:stamp}),/Please retry/);
 }
 assert.throws(()=>parseAurora({...raw,'Forecast Time':'2026-10-06T19:49:59Z'},now));assert.throws(()=>validateAuroraFeed({...parseAurora(raw,now),forecastAt:'2026-10-06T19:49:59.999Z'}));assert.throws(()=>parseAurora(raw,new Date(NaN)));
 const leap=parseAurora({...raw,'Observation Time':'2024-02-29T23:59:59.987Z','Forecast Time':'2024-03-01T00:30:00Z'},now);assert.equal(leap.observedAt,'2024-02-29T23:59:59.987Z');assert.equal(leap.forecastAt,'2024-03-01T00:30:00.000Z');assert.deepEqual(validateAuroraFeed(leap),leap);
 assert.equal(parseAurora({...raw,'Forecast Time':raw['Observation Time']},now).forecastAt,'2026-10-06T19:50:00.000Z');
});
test('aurora freshness refuses invalid, reversed and implausibly far-future clocks without rejecting a normal forecast',()=>{
 const feed=parseAurora(raw,now);assert.equal(auroraIsStale({...feed,forecastAt:new Date(+now+90*60000).toISOString()},+now),false);assert.equal(auroraIsStale({...feed,forecastAt:new Date(+now+2*3600000).toISOString()},+now),false);
 for(const altered of [{forecastAt:new Date(+now+2*3600000+1).toISOString()},{observedAt:new Date(+now+15*60000+1).toISOString()},{fetchedAt:new Date(+now+15*60000+1).toISOString()},{forecastAt:'bad'},{observedAt:'bad'},{fetchedAt:'bad'},{forecastAt:'2026-10-06T19:49:59Z'}])assert.equal(auroraIsStale({...feed,...altered},+now),true);
 assert.equal(auroraTimingIssue({...feed,forecastAt:'2026-02-30T20:00:00Z'},+now),'invalid');assert.equal(auroraTimingIssue({...feed,fetchedAt:new Date(+now+15*60000+1).toISOString()},+now),'future');assert.equal(auroraTimingIssue(feed,+now+3*3600000),'old');assert.equal(auroraTimingIssue(feed,+now),null);
 assert.equal(auroraIsStale(feed,NaN),true);assert.equal(auroraIsStale(feed,+now+3*3600000),true);
});
test('nearest aurora cells use angular distance at high latitudes, across the date line and at poles',()=>{
 const north=[[0,79,10],[2,80,90]],south=[[0,-79,10],[2,-80,90]],copy=structuredClone(north);assert.equal(nearestAurora(north,80,0),north[1]);assert.equal(nearestAurora(south,-80,0),south[1]);assert.deepEqual(north,copy);
 const boundary=[[180,80,10],[359,80,60]];assert.equal(nearestAurora(boundary,80,-1),boundary[1]);assert.equal(nearestAurora(boundary,80,719),boundary[1]);
 const pole=[[0,90,30],[180,90,90],[0,89,50]];assert.equal(nearestAurora(pole,90,180),pole[0]);assert.equal(nearestAurora([],80,0),null);
 for(const [lat,lon] of [[NaN,0],[91,0],[-91,0],[0,Infinity]])assert.equal(nearestAurora(north,lat,lon),null);
});
