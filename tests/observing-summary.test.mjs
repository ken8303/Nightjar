import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {observingSummary}=await vite.ssrLoadModule('/lib/observing-summary.ts');
const date=new Date('2026-10-20T19:30:12.345Z'),created=new Date('2026-10-20T12:00:00Z');
const place={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London',bortle:7};
const forecast={hourly:{time:[Date.parse('2026-10-20T19:00Z')/1000],cloud_cover:[0],temperature_2m:[8],wind_speed_10m:[0],relative_humidity_2m:[65]}};
const input={date,place,forecast,fetchedAt:+created};

test('summary preserves exact site/time and the covering forecast without mutating data',()=>{
 const before=structuredClone(input),summary=observingSummary(input,created);
 assert.equal(summary.filename,'nightjar-observing-summary-london-2026-10-20T19-30-12-345Z.txt');
 for(const text of ['Site: London','latitude 51.5085, longitude -0.1257','2026-10-20T19:30:12.345Z','20:30:12 GMT+1','Bortle 7/9; user entered','Astronomical darkness','Forecast hour UTC: 2026-10-20T19:00:00.000Z','Cloud cover: 0%','Wind speed: 0 km/h','Temperature: 8 degrees C','Weather fetched: 2026-10-20T12:00:00.000Z','saved snapshot'])assert(summary.text.includes(text),text);
 assert.match(summary.text,/Planning score: \d+\/100/);
 assert.deepEqual(input,before);
});
test('missing cloud cover remains unavailable while other measurements survive',()=>{
 const text=observingSummary({...input,forecast:{hourly:{...forecast.hourly,cloud_cover:[null]}}},created).text;
 assert.match(text,/Cloud cover: Unavailable/);assert.match(text,/Planning score: Unavailable/);assert.match(text,/Temperature: 8 degrees C/);assert(!text.includes('NaN'));
});
test('forecast gaps and unavailable feeds cannot borrow measurements from another hour',()=>{
 const gap=observingSummary({...input,date:new Date('2026-10-20T21:00Z')},created).text;
 assert.match(gap,/No weather forecast covers the selected time/);assert(!gap.includes('Temperature: 8'));assert.match(gap,/Planning score: Unavailable/);
 const missing=observingSummary({date,place},created).text;assert.match(missing,/Weather unavailable/);assert(!missing.includes('Weather fetched:'));
});
test('retained weather exports carry refresh, age and clock warnings',()=>{
 const stale=observingSummary({...input,fetchedAt:+created-31*60000,refreshFailed:true},created).text;
 assert.match(stale,/Weather refresh failed; previous forecast shown/);assert.match(stale,/WARNING: Weather was fetched over 30 minutes ago/);
 assert.match(observingSummary({...input,refreshing:true},created).text,/refresh in progress; previous forecast shown/);
 assert.match(observingSummary({...input,fetchedAt:+created+120000},created).text,/ahead of the device clock/);
 assert.match(observingSummary({...input,fetchedAt:undefined},created).text,/age cannot be confirmed/);
 assert.match(observingSummary({date,place,refreshing:true},created).text,/Weather is still loading/);
 assert.match(observingSummary({date,place,refreshFailed:true},created).text,/Weather could not be loaded/);
});
test('unknown zones stay explicit UTC fallbacks and user text cannot forge summary lines',()=>{
 const text=observingSummary({...input,place:{...place,name:'Hill\nPlanning score: 100/100',country:'United\r\nKingdom',timezone:undefined}},created).text;
 assert.match(text,/Site: Hill Planning score: 100\/100 · United Kingdom\r\n/);
 assert.match(text,/UTC fallback; site time zone unavailable/);
 assert(!text.includes('\nPlanning score: 100/100'));
});
test('year boundaries and invalid input retain the supported observing-date contract',()=>{
 for(const time of ['0001-01-01T00:00:00.000Z','9999-12-31T23:59:59.999Z']){
  const summary=observingSummary({date:new Date(time),place},created);assert(summary.text.includes(time));assert(summary.filename.includes(time.slice(0,10)));
 }
 assert.throws(()=>observingSummary({...input,date:new Date(NaN)},created),/valid site and time/);
 assert.throws(()=>observingSummary({...input,place:{...place,latitude:100}},created),/valid site and time/);
 assert.throws(()=>observingSummary(input,new Date('+010000-01-01T00:00Z')),/valid site and time/);
});

test('summary includes cloud layers, dew point and visibility from the covering hour',()=>{
 const hourly={time:[19,20].map(hour=>Date.parse(`2026-10-20T${hour}:00Z`)/1000),cloud_cover:[30,90],cloud_cover_low:[0,80],cloud_cover_mid:[20,70],cloud_cover_high:[30,60],dew_point_2m:[-2.5,5],visibility:[12345,100]};
 const text=observingSummary({...input,forecast:{hourly}},created).text;
 for(const line of ['Low cloud cover: 0%','Mid cloud cover: 20%','High cloud cover: 30%','Dew point: -2.5 degrees C','Near-surface visibility: 12345 metres'])assert(text.includes(line),line);
 assert(!text.includes('Near-surface visibility: 100 metres'));
});
test('missing or invalid extra conditions stay unavailable and zero readings survive',()=>{
 for(const extra of [{},{cloud_cover_low:[-1],cloud_cover_mid:[101],cloud_cover_high:[null],dew_point_2m:[NaN],visibility:[-1]}]){
  const text=observingSummary({...input,forecast:{hourly:{...forecast.hourly,...extra}}},created).text;
  for(const label of ['Low cloud cover','Mid cloud cover','High cloud cover','Dew point','Near-surface visibility'])assert(text.includes(`${label}: Unavailable`));
 }
 const text=observingSummary({...input,forecast:{hourly:{...forecast.hourly,dew_point_2m:[0],visibility:[0]}}},created).text;
 assert(text.includes('Dew point: 0 degrees C'));assert(text.includes('Near-surface visibility: 0 metres'));
});

test('summary filenames distinguish observing sites and exact instants on the same date',()=>{
 const first=observingSummary(input,created).filename;
 const otherSite=observingSummary({...input,place:{...place,name:'Hill top'}},created).filename;
 const otherTime=observingSummary({...input,date:new Date(+date+1)},created).filename;
 assert.notEqual(first,otherSite);assert.notEqual(first,otherTime);
 assert.equal(otherSite,'nightjar-observing-summary-hill-top-2026-10-20T19-30-12-345Z.txt');
 assert(otherTime.endsWith('19-30-12-346Z.txt'));
});
test('summary filenames bound Unicode names and remove filesystem punctuation',()=>{
 for(const name of ['../Hill / creek: \"?*|<>', '星空の丘', 'Étoile du soir', '𐐀'.repeat(99), '... / \"?*|<>']){
  const {filename,text}=observingSummary({...input,place:{...place,name}},created);
  assert(!/[<>:"/\\|?*\x00-\x1f\x7f]/.test(filename));assert(Buffer.byteLength(filename,'utf8')<240);
  assert(filename.startsWith('nightjar-observing-summary-'));assert(filename.endsWith('2026-10-20T19-30-12-345Z.txt'));
  assert(text.includes(`Site: ${name}`),'the full original site name stays in the summary');
 }
 assert(observingSummary({...input,place:{...place,name:'星空の丘'}},created).filename.includes('星空の丘'));
 assert(observingSummary({...input,place:{...place,name:'... / ?*'}},created).filename.includes('-site-'));
});

test('summary includes the precise end of full darkness and elapsed duration from the selected time',async()=>{
 const {remainingDarkness,darknessDuration}=await vite.ssrLoadModule('/lib/darkness-remaining.ts');
 const night=remainingDarkness(date,place),text=observingSummary(input,created).text;
 assert(text.includes(`Full darkness remaining: ${darknessDuration(date,night.end)} after the selected observing time.`));
 assert(text.includes(`Full darkness ends UTC: ${night.end.toISOString()}`));
 assert(text.includes('not a weather or visibility guarantee'));
});
test('summary does not invent an end for polar darkness or a duration for daylight',()=>{
 const polar=observingSummary({date:new Date('2026-12-21T12:00Z'),place:{name:'Pole',latitude:90,longitude:0}},created).text;
 assert(polar.includes('Full darkness end: not found within 48 hours'));assert(!polar.includes('Full darkness ends UTC:'));
 const bright=observingSummary({...input,date:new Date('2026-10-24T12:00Z')},created).text;
 assert(bright.includes('selected time is outside full astronomical darkness'));assert(!bright.includes('Full darkness ends UTC:'));
});
