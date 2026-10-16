import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {sevenNightOutlook,bestNightWindow}=await vite.ssrLoadModule('/lib/night-outlook.ts');
const {hourBelowAltitude,bodyPosition,A}=await vite.ssrLoadModule('/lib/sky.ts');
const place={name:'Window policy QA',latitude:51.5,longitude:0,timezone:'UTC'},from=new Date('2026-10-09T19:30Z');
const hourly=(times,cloud)=>({time:times.map(value=>Date.parse(value)/1000),cloud_cover:cloud});
test('a supported final-year sample cannot recommend an hour ending outside the calendar',()=>{
 const last=new Date('9999-12-31T23:00Z');assert(bodyPosition(A.Body.Sun,last,place).altitude<-18,'fixture must be dark');
 const nights=sevenNightOutlook({time:[+last/1000],cloud_cover:[0]},place,last);
 assert.equal(nights.length,1);assert.equal(nights[0].best,null);
 assert.equal(hourBelowAltitude(A.Body.Sun,last,place,90),false);
 assert.equal(hourBelowAltitude(A.Body.Sun,new Date('9999-12-31T22:00Z'),place,90),true);
 assert.deepEqual(sevenNightOutlook({time:[Date.parse('+010000-01-01T00:00Z')/1000],cloud_cover:[0]},place,last),[]);
});
test('a nightly choice prefers a complete pair even when a disconnected single hour scores higher',()=>{
 const data=hourly(['2026-10-09T20:00Z','2026-10-09T21:00Z','2026-10-09T23:00Z'],[90,90,0]),before=structuredClone(data);
 const nights=sevenNightOutlook(data,place,from);assert.equal(nights.length,1);assert.equal(nights[0].best.hours,2);assert.equal(nights[0].best.date.toISOString(),'2026-10-09T20:00:00.000Z');assert(nights[0].best.score<100);assert.deepEqual(data,before);
});
test('the best upcoming choice compares nightly scores before duration and uses longer windows for ties',()=>{
 const pair=sevenNightOutlook(hourly(['2026-10-09T20:00Z','2026-10-09T21:00Z'],[90,90]),place,from)[0];
 const single=sevenNightOutlook(hourly(['2026-10-10T23:00Z'],[0]),place,from)[0];
 assert.equal(bestNightWindow([pair,single]),single);
 const clearPair=sevenNightOutlook(hourly(['2026-10-09T20:00Z','2026-10-09T21:00Z'],[0,0]),place,from)[0];
 assert.equal(clearPair.best.score,single.best.score);assert.equal(bestNightWindow([single,clearPair]),clearPair);assert.equal(bestNightWindow([clearPair,single]),clearPair);
});
test('gaps, missing coverage and already-started hours do not invent a complete recommended pair',()=>{
 const data=hourly(['2026-10-09T20:00Z','2026-10-09T21:00Z','2026-10-09T23:00Z'],[0,null,20]);
 const early=sevenNightOutlook(data,place,from)[0];assert.equal(early.best.hours,1);assert.equal(early.best.date.toISOString(),'2026-10-09T20:00:00.000Z');
 const later=sevenNightOutlook(data,place,new Date('2026-10-09T20:30Z'))[0];assert.equal(later.best.hours,1);assert.equal(later.best.date.toISOString(),'2026-10-09T23:00:00.000Z');assert.equal(later.forecastHours,1);
 assert.equal(bestNightWindow(sevenNightOutlook(hourly(['2026-10-09T20:00Z'],[null]),place,from)),null);
});

test('a brief polar twilight crossing between quarter-hour samples cannot be recommended as a full dark hour',()=>{
 const site={name:'Brief polar twilight',latitude:85.07938514866692,longitude:-2.4,timezone:'UTC'},start=new Date('2026-12-21T12:00:00.000Z');
 // All five old samples are below the threshold, while the actual short
 // excursion lasts about 6.6 minutes and peaks between the first two.
 for(let minute=0;minute<=60;minute+=15)assert(bodyPosition(A.Body.Sun,new Date(+start+minute*60000),site).altitude<-18);
 assert(bodyPosition(A.Body.Sun,new Date('2026-12-21T12:07:38.712Z'),site).altitude>-18);
 assert.equal(hourBelowAltitude(A.Body.Sun,start,site,-18),false);
 const nights=sevenNightOutlook({time:[+start/1000],cloud_cover:[0]},site,start);
 assert.equal(nights.length,1);assert.equal(nights[0].best,null);
});
