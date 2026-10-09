import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {sevenNightOutlook,bestNightWindow}=await vite.ssrLoadModule('/lib/night-outlook.ts');
const place={name:'Window policy QA',latitude:51.5,longitude:0,timezone:'UTC'},from=new Date('2026-10-09T19:30Z');
const hourly=(times,cloud)=>({time:times.map(value=>Date.parse(value)/1000),cloud_cover:cloud});
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
