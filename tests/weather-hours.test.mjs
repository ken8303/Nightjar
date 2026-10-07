import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseWeatherForecast,forecastHourIndex}=await vite.ssrLoadModule('/lib/weather-hours.ts');
const start=Date.parse('2026-10-25T00:00Z')/1000;
const feed=()=>({timezone:'Europe/London',hourly:{time:[start,start+3600],cloud_cover:[0,100],temperature_2m:[5,4]}});
test('forecast preserves UTC clock-change samples, zero coverage and source independence',()=>{
 const raw=feed(),parsed=parseWeatherForecast(raw);
 assert.deepEqual(parsed,raw);assert.equal(forecastHourIndex(parsed.hourly.time,new Date((start+3600)*1000)),1);
 parsed.hourly.time[0]=0;parsed.hourly.cloud_cover[0]=50;assert.equal(raw.hourly.time[0],start);assert.equal(raw.hourly.cloud_cover[0],0);
});
test('empty, oversized, duplicate, reversed and overlapping forecast timestamps are rejected',()=>{
 for(const time of [[],Array.from({length:241},(_,i)=>start+i*3600),[start,start],[start+3600,start],[start,start+3599],[start,start+241*3600],[start,NaN],[start,'invalid']])assert.throws(()=>parseWeatherForecast({hourly:{time,cloud_cover:time.map(()=>0)}}),/timestamps/);
});
test('hourly gaps remain explicit and cannot make an adjacent-hour match',()=>{
 const parsed=parseWeatherForecast({hourly:{time:[start,start+7200],cloud_cover:[10,20]}});
 assert.equal(forecastHourIndex(parsed.hourly.time,new Date((start+3600)*1000)),-1);
});
test('unaligned weather fields cannot silently shift conditions to another hour',()=>{
 for(const hourly of [{time:[start],cloud_cover:[]},{time:[start],cloud_cover:null},{time:[start],cloud_cover:[0],temperature_2m:[3,4]},{time:[start],cloud_cover:[0],visibility:5000}])assert.throws(()=>parseWeatherForecast({hourly}),/unavailable|match/);
});
test('invalid metric values become unavailable without being clamped into good conditions',()=>{
 const raw={hourly:{time:[start,start+3600],cloud_cover:[-1,101],cloud_cover_low:[null,'0'],relative_humidity_2m:[-1,101],wind_speed_10m:[-1,0],visibility:[Infinity,0],temperature_2m:[NaN,-5],extra:[1,2]},timezone:'not-a-zone'};
 const parsed=parseWeatherForecast(raw);assert.equal(parsed.timezone,undefined);
 for(const field of ['cloud_cover','cloud_cover_low','relative_humidity_2m'])assert.deepEqual(parsed.hourly[field],[null,null]);
 assert.deepEqual(parsed.hourly.wind_speed_10m,[null,0]);assert.deepEqual(parsed.hourly.visibility,[null,0]);assert.deepEqual(parsed.hourly.temperature_2m,[null,-5]);assert.equal(parsed.hourly.extra,undefined);
});
