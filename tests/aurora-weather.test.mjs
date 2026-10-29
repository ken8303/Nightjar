import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {auroraWeatherAtForecast}=await vite.ssrLoadModule('/lib/aurora-weather.ts');
const place={name:'London',latitude:51.5,longitude:0},now=Date.parse('2026-10-26T23:45:00Z');
const feed={observedAt:'2026-10-26T23:40:00.000Z',forecastAt:'2026-10-27T00:05:00.000Z',fetchedAt:'2026-10-26T23:45:00.000Z',cells:[]};
const weather={forecast:{hourly:{time:[Date.parse('2026-10-26T23:00:00Z')/1000,Date.parse('2026-10-27T00:00:00Z')/1000],cloud_cover:[5,70]}},fetchedAt:now,loading:false,error:false};
test('cloud context uses NOAA forecast time, not the observation or planner hour',()=>{
 const result=auroraWeatherAtForecast(feed,place,weather,now);assert.equal(result.status,'available');assert.equal(result.minimum,70);assert.equal(result.maximum,70);
 const clear={...weather,forecast:{hourly:{...weather.forecast.hourly,cloud_cover:[5,0]}}};assert.equal(auroraWeatherAtForecast(feed,place,clear,now).minimum,0);
});
test('daylight, stale NOAA data, gaps and stale or failed weather never produce a cloud value',()=>{
 const day={...feed,observedAt:'2026-10-27T11:45:00.000Z',forecastAt:'2026-10-27T12:00:00.000Z',fetchedAt:'2026-10-27T11:50:00.000Z'},noon=Date.parse('2026-10-27T11:50:00Z');
 assert.equal(auroraWeatherAtForecast(day,place,weather,noon).status,'outside-darkness');assert.equal(auroraWeatherAtForecast(feed,place,weather,now+3*3600000).status,'aurora-timing');
 for(const [input,status] of [[{...weather,loading:true},'loading'],[{...weather,error:true},'failed'],[{...weather,fetchedAt:now-30*60000},'stale'],[{...weather,fetchedAt:now+61000},'clock'],[{...weather,forecast:null},'unavailable'],[{...weather,forecast:{hourly:{time:[Date.parse('2026-10-26T23:00:00Z')/1000],cloud_cover:[10]}}},'coverage'],[{...weather,forecast:{hourly:{...weather.forecast.hourly,cloud_cover:[5,null]}}},'coverage']])assert.equal(auroraWeatherAtForecast(feed,place,input,now).status,status);
});
