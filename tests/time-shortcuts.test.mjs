import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {shiftObservingHour,validObservingDate}=await vite.ssrLoadModule('/lib/observing-time.ts');
const {nextAstronomicalDarkness,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
const {closestForecastHour}=await vite.ssrLoadModule('/lib/weather-planning.ts');
const london={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'};

test('hour shortcuts preserve elapsed time and fine precision across both clock changes',()=>{
 for(const text of ['2026-03-29T00:30:12.345Z','2026-10-25T00:30:12.345Z']){
  const date=new Date(text),next=shiftObservingHour(date,1);
  assert.equal(+next-+date,3600000);
  assert.equal(next.getUTCSeconds(),12);assert.equal(next.getUTCMilliseconds(),345);
  assert.equal(shiftObservingHour(next,-1).toISOString(),text);
  assert.equal(date.toISOString(),text,'input is unchanged');
 }
});
test('hour shortcuts refuse unsupported years and invalid inputs without clamping',()=>{
 assert.equal(shiftObservingHour(new Date('0001-01-01T00:30Z'),-1),null);
 assert.equal(shiftObservingHour(new Date('9999-12-31T23:30Z'),1),null);
 assert.equal(shiftObservingHour(new Date(NaN),1),null);
 assert.equal(shiftObservingHour(new Date(),0),null);
 assert.equal(shiftObservingHour(new Date('0001-01-01T01:00Z'),-1).toISOString(),'0001-01-01T00:00:00.000Z');
});
test('darkness shortcut chooses the current dark instant or the next geometric crossing',()=>{
 const dark=new Date('2026-10-20T23:00:12.345Z');
 assert.equal(nextAstronomicalDarkness(dark,london).toISOString(),dark.toISOString());
 const day=new Date('2026-10-20T12:00Z'),next=nextAstronomicalDarkness(day,london);
 assert(validObservingDate(next));assert(+next>+day&&+next-+day<=48*3600000);
 assert(sunAltitude(next,london)<-18,'selected instant is genuinely dark, beyond the numerical crossing');
 assert.equal(next.getUTCSeconds(),0);assert.equal(next.getUTCMilliseconds(),0);
 assert(sunAltitude(new Date(+next-60000),london)>-18,'first supported dark minute is selected');
});
test('darkness shortcut has an explicit empty result during polar daylight and at date limits',()=>{
 const pole={name:'North Pole',latitude:90,longitude:0};
 assert.equal(nextAstronomicalDarkness(new Date('2026-06-21T12:00Z'),pole),null);
 assert.equal(nextAstronomicalDarkness(new Date(NaN),london),null);
 const end=new Date('9999-12-31T23:59:59.999Z'),result=nextAstronomicalDarkness(end,pole);
 assert(result===null||validObservingDate(result)&&+result<=+end);
});
test('forecast recovery uses real samples before, after and inside timestamp gaps',()=>{
 const start=Date.parse('2026-10-20T18:00Z')/1000,times=[start,start+3600,start+10800];
 const recover=iso=>closestForecastHour(times,new Date(iso)).toISOString();
 assert.equal(recover('2026-10-19T00:00Z'),'2026-10-20T18:00:00.000Z');
 assert.equal(recover('2026-10-29T00:00Z'),'2026-10-20T21:00:00.000Z');
 assert.equal(recover('2026-10-20T20:00Z'),'2026-10-20T21:00:00.000Z','equal distance prefers the future sample');
 assert.equal(recover('2026-10-20T19:15Z'),'2026-10-20T19:00:00.000Z');
 assert.deepEqual(times,[start,start+3600,start+10800]);
});
test('forecast recovery ignores invalid timestamps and never manufactures a sample',()=>{
 const date=new Date('2026-10-20T18:00Z');
 assert.equal(closestForecastHour(undefined,date),null);
 assert.equal(closestForecastHour([],date),null);
 assert.equal(closestForecastHour([NaN,Infinity,-62167219200],date),null);
 assert.equal(closestForecastHour([+date/1000],new Date(NaN)),null);
 assert.equal(closestForecastHour([Infinity,+date/1000,NaN],date).toISOString(),date.toISOString());
});
