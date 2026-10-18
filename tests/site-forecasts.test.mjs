import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {storeSiteForecast,siteForecastState,siteForecastContext,siteForecastKey}=await vite.ssrLoadModule('/lib/site-forecasts.ts');
const data={timezone:'Europe/London',hourly:{time:[1791403200],cloud_cover:[20]}};
test('forecast selection and cache identity share exact date-line endpoints without rounding distinct nearby coordinates',()=>{
 const east={name:'East notation',latitude:-17.75,longitude:180},west={...east,name:'West notation',longitude:-180},before=structuredClone([east,west]);
 assert.equal(siteForecastKey(east),siteForecastKey(west));
 assert.equal(new Set([east,west].map(siteForecastKey)).size,1);
 const cached={[siteForecastKey(east)]:{data,requestKey:'ready'}};assert.equal(cached[siteForecastKey(west)].data,data);
 for(const point of [{...east,latitude:-17.75001},{...east,longitude:179.99999},{...east,longitude:0}])assert.notEqual(siteForecastKey(east),siteForecastKey(point));
 assert.deepEqual([east,west],before);
});
test('failed site refresh preserves the exact successful forecast and timestamp, then retry replaces both',()=>{
 const previous={a:{data,requestKey:'a:0',fetchedAt:1000}},before=structuredClone(previous);
 const failed=storeSiteForecast(previous,'a',{requestKey:'a:1',error:'Unavailable'},['a']);
 assert.equal(failed.a.data,data);assert.equal(failed.a.fetchedAt,1000);assert.equal(failed.a.error,'Unavailable');assert.deepEqual(previous,before);
 const fresh={...data,hourly:{...data.hourly,cloud_cover:[50]}};
 const recovered=storeSiteForecast(failed,'a',{requestKey:'a:2',data:fresh,fetchedAt:5000},['a']);
 assert.equal(recovered.a.data,fresh);assert.equal(recovered.a.fetchedAt,5000);assert.equal(recovered.a.error,undefined);assert.equal(failed.a.data,data);
});
test('site results remain isolated by coordinates and only active site records are retained',()=>{
 const previous={a:{data,requestKey:'old',fetchedAt:1000},b:{data:{...data,timezone:'Asia/Tokyo'},requestKey:'old',fetchedAt:2000}};
 const result=storeSiteForecast(previous,'c',{requestKey:'new',error:'Unavailable'},['b','c']);
 assert.deepEqual(Object.keys(result).sort(),['b','c']);assert.equal(result.c.data,undefined);assert.equal(result.c.fetchedAt,undefined);assert.equal(result.b,previous.b);
 assert.deepEqual(storeSiteForecast(previous,'a',{requestKey:'late',data},['b']),{b:previous.b});
});
test('refresh state hides an obsolete error while loading and exposes failure and stale age after settlement',()=>{
 assert.deepEqual(siteForecastState(undefined,'new',1000),{loading:true,error:'',stale:false,clockChanged:false});
 const result={data,requestKey:'old',fetchedAt:1000,error:'Failed'};
 assert.deepEqual(siteForecastState(result,'new',1000),{loading:true,error:'',stale:false,clockChanged:false});
 assert.deepEqual(siteForecastState(result,'old',1800999),{loading:false,error:'Failed',stale:false,clockChanged:false});
 assert.deepEqual(siteForecastState(result,'old',1801000),{loading:false,error:'Failed',stale:true,clockChanged:false});
 assert.deepEqual(siteForecastState({requestKey:'new',error:'Failed'},'new',1801000),{loading:false,error:'Failed',stale:false,clockChanged:false});
});

test('retained forecasts identify a backward clock correction beyond the minute-resolution tolerance',()=>{
 const result={data,requestKey:'current',fetchedAt:7200000};
 assert.equal(siteForecastState(result,'current',3600000).clockChanged,true);
 assert.equal(siteForecastState(result,'current',7140000).clockChanged,false);
 assert.equal(siteForecastState(result,'current',7200000).clockChanged,false);
 assert.equal(siteForecastState({requestKey:'current'},'current',3600000).clockChanged,false);
});


test('comparison display fallback never invents a known time zone for planning',()=>{
 const place={name:'Coordinate-only site',latitude:51.5,longitude:0,bortle:3,extra:'Keep metadata'},before=structuredClone(place);
 for(const forecast of [undefined,{hourly:data.hourly}]){
  const context=siteForecastContext(place,forecast);
  assert.equal(context.timezone,'UTC');assert.equal(context.timezoneKnown,false);
  assert.equal(context.planningPlace,place);assert.equal(Object.hasOwn(context.planningPlace,'timezone'),false);
 }
 assert.deepEqual(place,before);
});
test('comparison planning keeps known site zones and adopts a provider zone without changing other metadata',()=>{
 const place={name:'Saved site',latitude:51.5,longitude:0,timezone:'America/New_York',bortle:3,extra:'Keep metadata'},before=structuredClone(place);
 for(const forecast of [undefined,{hourly:data.hourly}]){
  const context=siteForecastContext(place,forecast);
  assert.equal(context.timezone,'America/New_York');assert.equal(context.timezoneKnown,true);assert.deepEqual(context.planningPlace,place);
 }
 const resolved=siteForecastContext(place,data);
 assert.equal(resolved.timezone,'Europe/London');assert.equal(resolved.timezoneKnown,true);assert.deepEqual(resolved.planningPlace,{...place,timezone:'Europe/London'});assert.deepEqual(place,before);
 const utc=siteForecastContext({...place,timezone:undefined},{...data,timezone:'UTC'});
 assert.equal(utc.timezoneKnown,true);assert.equal(utc.planningPlace.timezone,'UTC');
});
