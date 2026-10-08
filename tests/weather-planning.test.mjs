import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {weatherHours}=await vite.ssrLoadModule('/lib/weather-hours.ts');
const {forecastPlanning,forecastHourLabel}=await vite.ssrLoadModule('/lib/weather-planning.ts');
const place={name:'London QA',latitude:51.5,longitude:0,timezone:'UTC'},start=Date.parse('2026-10-08T20:00Z')/1000;
const hourly=(offsets,cloud)=>({time:offsets.map(value=>start+value*3600),cloud_cover:offsets.map((_,index)=>Array.isArray(cloud)?cloud[index]:cloud)});
test('forecast rows stay inside twelve elapsed hours and include partial boundary hours without filling timestamp gaps',()=>{
 const data=hourly(Array.from({length:20},(_,index)=>index),40),before=structuredClone(data);
 const exact=weatherHours(data,new Date(start*1000),place),partial=weatherHours(data,new Date((start+1800)*1000),place);
 assert.equal(exact.length,12);assert.equal(partial.length,13);assert.equal(+partial.at(-1).date,(start+12*3600)*1000);assert.deepEqual(data,before);
 const gapped=weatherHours(hourly(Array.from({length:20},(_,i)=>i).filter(i=>i!==1),40),new Date(start*1000),place);assert.equal(gapped.length,11);assert.equal(+gapped.at(-1).date,(start+11*3600)*1000);assert(!gapped.some(hour=>+hour.date===(start+3600)*1000));
});
test('planning distinguishes missing cloud scores from known zeros and preserves available measurements',()=>{
 const date=new Date(start*1000),missing=weatherHours({...hourly([0,1,2],null),temperature_2m:[12,13,14]},date,place),summary=forecastPlanning(missing,date,place);
 assert.deepEqual({score:summary.score,best:summary.best,total:summary.total,scored:summary.scored,missing:summary.missing},{score:null,best:null,total:3,scored:0,missing:3});assert.equal(missing[0].temp,12);
 const partial=weatherHours(hourly([0,1,2],[null,0,null]),date,place),before=structuredClone(partial),planned=forecastPlanning(partial,date,place);assert.equal(planned.scored,1);assert.equal(planned.missing,2);assert.equal(+planned.best.date,(start+3600)*1000);assert.deepEqual(partial,before);
 const daylight=new Date('2026-10-08T12:00Z'),dayData={time:[+daylight/1000,+daylight/1000+3600],cloud_cover:[0,0]},known=forecastPlanning(weatherHours(dayData,daylight,place),daylight,place);assert.equal(known.score,0);assert.equal(known.scored,2);assert.equal(known.missing,0);
});
test('the current score follows the exact selected time and no best candidate predates it',()=>{
 const date=new Date('2026-10-08T05:55Z'),data={time:Array.from({length:15},(_,i)=>Date.parse('2026-10-08T05:00Z')/1000+i*3600),cloud_cover:Array(15).fill(0)},hours=weatherHours(data,date,place),before=structuredClone(hours),planned=forecastPlanning(hours,date,place);
 assert(hours[0].score>0);assert.equal(planned.score,0);assert.equal(planned.best.score,0);assert.equal(+planned.best.date,+date);assert.deepEqual(hours,before);
 const half=new Date((start+1800)*1000),night=forecastPlanning(weatherHours(hourly([0,1,2],40),half,place),half,place);assert.equal(+night.best.date,+half);assert(+night.best.date>=+half);
});
test('forecast labels distinguish repeated clock-change hours and year boundaries',()=>{
 const first=forecastHourLabel(new Date('2026-10-25T00:00Z'),'Europe/London'),second=forecastHourLabel(new Date('2026-10-25T01:00Z'),'Europe/London');assert.equal(first.time,'01:00');assert.equal(second.time,'01:00');assert.match(first.detail,/GMT\+1/);assert.match(second.detail,/GMT(?:\+0)?$/);assert.notEqual(first.full,second.full);
 assert.match(forecastHourLabel(new Date('2026-12-31T23:00Z'),'UTC').full,/2026/);assert.match(forecastHourLabel(new Date('2027-01-01T00:00Z'),'UTC').full,/2027/);
});
