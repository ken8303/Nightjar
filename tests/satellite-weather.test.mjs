import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {satelliteWindowWeather:read}=await vite.ssrLoadModule('/lib/satellite-weather.ts');
const hour=3600000,base=Date.parse('2026-10-20T05:00:00Z'),now=Date.parse('2026-10-20T00:00:00Z');
const weather=(clouds=[20,80,0])=>({forecast:{hourly:{time:clouds.map((_,i)=>(base+i*hour)/1000),cloud_cover:clouds}},fetchedAt:now,loading:false,error:false});

test('one forecast hour covers a short ISS window without interpolation or changing source data',()=>{
 const source=weather(),before=structuredClone(source);
 assert.deepEqual(read(base+19*60000,base+23*60000,source,now),{status:'available',minimum:20,maximum:20,hours:1,firstHour:base,lastHour:base,fetchedAt:now});
 assert.deepEqual(source,before);
});
test('cross-hour windows report the complete covering range and preserve actual zero cloud',()=>{
 assert.deepEqual(read(base+59*60000,base+hour+2*60000,weather(),now),{status:'available',minimum:20,maximum:80,hours:2,firstHour:base,lastHour:base+hour,fetchedAt:now});
 const zero=read(base+2*hour,base+2*hour+10000,weather(),now);
 assert.equal(zero.status,'available');assert.equal(zero.minimum,0);assert.equal(zero.maximum,0);
 const fractional=read(base,base+hour+10000,weather([.1,.4]),now);assert.equal(fractional.minimum,.1);assert.equal(fractional.maximum,.4);
});
test('the exclusive window end does not demand another hour or borrow a future sample',()=>{
 assert.equal(read(base,base+hour,weather([20]),now).status,'available');
 assert.equal(read(base,base+hour+1,weather([20]),now).status,'coverage');
 assert.equal(read(base-1,base+10000,weather(),now).status,'coverage');
 assert.equal(read(base+3*hour,base+3*hour+10000,weather(),now).status,'coverage');
});
test('gaps, overlapping hours and missing or invalid clouds never become a clear estimate',()=>{
 for(const cloud of [null,undefined,NaN,Infinity,-1,101])assert.equal(read(base,base+2*hour,weather([20,cloud]),now).status,'coverage');
 for(const delta of [30*60000,2*hour,NaN]){
  const source=weather();source.forecast.hourly.time[1]=(base+delta)/1000;
  assert.equal(read(base,base+2*hour,source,now).status,'coverage');
 }
 const source=weather();source.forecast.hourly.time=[];assert.equal(read(base,base+10000,source,now).status,'coverage');
});
test('refresh and failure states withhold retained values until a usable forecast is available',()=>{
 const source=weather();
 assert.equal(read(base,base+10000,{...source,loading:true},now).status,'loading');
 assert.equal(read(base,base+10000,{...source,error:true},now).status,'failed');
 assert.equal(read(base,base+10000,{...source,forecast:null},now).status,'unavailable');
 assert.equal(read(base,base+10000,source,now).status,'available');
});
test('retrieval age and clock corrections use the existing weather freshness limits',()=>{
 const source=weather();
 assert.equal(read(base,base+10000,source,now+30*60000-1).status,'available');
 assert.equal(read(base,base+10000,source,now+30*60000).status,'stale');
 assert.equal(read(base,base+10000,source,now-60000).status,'available','minute snapshot tolerance is retained');
 assert.equal(read(base,base+10000,source,now-60001).status,'clock');
 for(const fetchedAt of [undefined,NaN,Infinity,now+.5])assert.equal(read(base,base+10000,{...source,fetchedAt},now).status,'timing');
 assert.equal(read(base,base+10000,source,NaN).status,'timing');
});
test('invalid or excessively long window bounds cannot acquire cloud context',()=>{
 for(const [start,end] of [[base,base],[base+1,base],[NaN,base],[base,Infinity],[base,base+86400001],[Date.parse('0000-12-31T23:59:00Z'),base]])assert.equal(read(start,end,weather(),now).status,'coverage');
});


test('refined fractional-millisecond boundaries select covering hours without Date time clipping',()=>{
 assert.equal(read(base+19*60000+.4985,base+23*60000+.7235,weather(),now).status,'available');
 const source={...weather(),forecast:{hourly:{time:[-3600,0],cloud_cover:[20,80]}}};
 const crossing=read(-.5,.5,source,now);
 assert.equal(crossing.status,'available');assert.equal(crossing.hours,2);assert.equal(crossing.minimum,20);assert.equal(crossing.maximum,80);
 const endAtBoundary=read(-10000.5,0,source,now);assert.equal(endAtBoundary.status,'available');assert.equal(endAtBoundary.hours,1);
});

test('cloud context does not display a twilight forecast-hour timestamp for a dark window',async()=>{
 const {default:SatelliteWindowWeather}=await vite.ssrLoadModule('/components/satellite-window-weather.tsx');
 const {A,observer,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
 const place={name:'London',latitude:51.5,longitude:0};
 const dusk=A.SearchAltitude(A.Body.Sun,observer(place),-1,new Date('2026-10-24T12:00:00Z'),1,-18).date;
 const start=+dusk+60000,end=start+60000,forecastHour=Math.floor(start/hour)*hour;
 assert(sunAltitude(new Date(start),place)<-18);assert(sunAltitude(new Date(end),place)<-18);assert(sunAltitude(new Date(forecastHour),place)>=-18);
 const input={forecast:{hourly:{time:[forecastHour/1000],cloud_cover:[45]}},fetchedAt:start,loading:false,error:false};
 const html=renderToStaticMarkup(createElement(SatelliteWindowWeather,{start,end,weather:input,now:start}));
 assert.match(html,/Hourly cloud cover: about 45%/);assert.match(html,/may extend beyond it/);assert(!html.includes(new Date(forecastHour).toISOString()));
});
