import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {utcDate}=await vite.ssrLoadModule('/lib/utc-date.ts');
const {meteorCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
const {nextMeteorYear,meteorEvents,meteorConditions,meteorCloudSummary,meteorHourCloud,upcomingMeteorOccurrences}=await vite.ssrLoadModule('/lib/meteor-planning.ts');
test('meteor dates and next-year selection preserve early years rather than adding 1900',()=>{
 for(const year of [1,99,100,2026]){
  const padded=String(year).padStart(4,'0');
  assert.equal(utcDate(year,0,4).toISOString(),padded+'-01-04T00:00:00.000Z');
  assert.equal(nextMeteorYear(meteorEvents[0],utcDate(year,0,1)),year);
  assert.equal(nextMeteorYear(meteorEvents[0],utcDate(year,0,6)),year+1);
  const calendar=meteorCalendar('Quadrantids',year,0,4);assert(calendar.includes('DTSTART;VALUE=DATE:'+padded+'0103'));assert(calendar.includes('DTEND;VALUE=DATE:'+padded+'0105'));
 }
 assert.equal(utcDate(1,0,0).toISOString(),'0000-12-31T00:00:00.000Z');
});
test('meteor calendar exports reject nonexistent dates and unsupported ranges before creating a plausible event',()=>{
 for(const args of [['QA',2026,1,30],['QA',0,0,4],['QA',10000,0,4],['QA',2026,12,4],['QA',2026,0,0],['QA',1,0,1],['QA',9999,11,31],[' ',2026,0,4],['QA',NaN,0,4]])assert.throws(()=>meteorCalendar(...args));
 assert(meteorCalendar('Leap QA',2024,1,29).includes('DTEND;VALUE=DATE:20240301'));
});
test('meteor calendar lines stay within UTF-8 folding bounds without introducing extra event fields',()=>{
 const calendar=meteorCalendar('星空'.repeat(80)+'\r\nBEGIN:VEVENT,;',2026,7,13);
 for(const line of calendar.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);
 assert.equal(calendar.split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,1);
 assert(calendar.includes('DTSTART;VALUE=DATE:20260812'));assert(calendar.includes('DTEND;VALUE=DATE:20260814'));
 assert(calendar.includes('Typical annual dates only.'));
});

test('the upcoming meteor year advances at local noon when its typical night ends',()=>{
 const orionids=meteorEvents.find(event=>event.name==='Orionids');
 assert.equal(nextMeteorYear(orionids,new Date('2026-10-22T10:59:59Z'),'Europe/London'),2026);
 assert.equal(nextMeteorYear(orionids,new Date('2026-10-22T11:00:00Z'),'Europe/London'),2027);
 assert.equal(nextMeteorYear(orionids,new Date('2026-10-22T18:00:00Z'),'America/Los_Angeles'),2026);
 assert.equal(nextMeteorYear(orionids,new Date('2026-10-22T19:00:00Z'),'America/Los_Angeles'),2027);
});
test('remaining meteor windows exclude elapsed and partial hours without modifying full-window calculations',async()=>{
 const event=meteorEvents.find(event=>event.name==='Orionids'),place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
 const full=meteorConditions(event,2026,place),from=new Date('2026-10-22T01:15:00Z'),remaining=meteorConditions(event,2026,place,undefined,from);
 assert(full.darkHours>remaining.darkHours);assert(remaining.darkHours>0);
 if(remaining.window)assert(+remaining.window.start>=+from);
 const {isAstronomicalNight,moonInfo}=await vite.ssrLoadModule('/lib/sky.ts');
 assert(remaining.moonIlluminationTime);assert(isAstronomicalNight(remaining.moonIlluminationTime,place));assert(+remaining.moonIlluminationTime>=+from);assert.equal(remaining.moonIllumination,moonInfo(remaining.moonIlluminationTime,place).illumination);
 assert.equal(+remaining.moonIlluminationTime,+(remaining.window?.start??remaining.moonIlluminationTime));
 const expired=meteorConditions(event,2026,place,undefined,new Date('2026-10-23T00:00Z'));
 assert.equal(expired.darkHours,0);assert.equal(expired.moonFreeHours,0);assert.equal(expired.window,null);assert.equal(expired.cloudCover,null);assert.equal(expired.moonIllumination,null);assert.equal(expired.moonIlluminationTime,null);
});
test('a complete sampled meteor hour cannot extend beyond local noon in a fractional-offset zone',()=>{
 const event=meteorEvents.find(event=>event.name==='Geminids'),place={name:'Polar clock QA',latitude:90,longitude:0,timezone:'Asia/Kathmandu'};
 const conditions=meteorConditions(event,2026,place);assert(conditions.darkHours>0);
 if(conditions.window)assert(+conditions.window.end<=+new Date('2026-12-14T06:15:00Z'));
 const lastHour=meteorConditions(event,2026,place,undefined,new Date('2026-12-14T06:00:00Z'));
 assert.equal(lastHour.darkHours,0);assert.equal(lastHour.window,null);
});


test('meteor cloud estimates report complete, partial and missing coverage without treating gaps as clear skies',()=>{
 const event=meteorEvents.find(event=>event.name==='Geminids'),place={name:'Polar QA',latitude:90,longitude:0,timezone:'UTC'};
 const start=Date.parse('2026-12-13T12:00:00Z')/1000;
 const time=Array.from({length:24},(_,index)=>start+index*3600);
 const hourly={time,cloud_cover:time.map(()=>40)};
 const original=structuredClone(hourly);
 const full=meteorConditions(event,2026,place,hourly);
 assert(full.cloudSampleHours>1);assert.equal(full.cloudForecastHours,full.cloudSampleHours);assert.equal(full.cloudCover,40);
 assert(!meteorCloudSummary(full).includes('Partial coverage'));
 const baseline=meteorConditions(event,2026,place);
 const selectedStart=baseline.window?.start??new Date(start*1000);
 const partial=meteorConditions(event,2026,place,{time:[+selectedStart/1000],cloud_cover:[70]});
 assert.equal(partial.cloudForecastHours,1);assert.equal(partial.cloudCover,70);assert.equal(partial.cloudSampleHours,full.cloudSampleHours);
 assert(meteorCloudSummary(partial).includes('1 of '+full.cloudSampleHours));assert(meteorCloudSummary(partial).includes('Partial coverage'));
 const missing=meteorConditions(event,2026,place,{time,cloud_cover:time.map(()=>null)});
 assert.equal(missing.cloudForecastHours,0);assert.equal(missing.cloudCover,null);assert(meteorCloudSummary(missing).includes('unavailable'));
 for(const invalid of [NaN,-1,101,Infinity]){const result=meteorConditions(event,2026,place,{time,cloud_cover:time.map(()=>invalid)});assert.equal(result.cloudForecastHours,0);assert.equal(result.cloudCover,null)}
 const elapsed=meteorConditions(event,2026,place,hourly,new Date('2026-12-14T12:00:00Z'));
 assert.equal(elapsed.cloudSampleHours,0);assert.equal(elapsed.cloudForecastHours,0);assert.equal(meteorCloudSummary(elapsed),'No remaining dark hours to check against the cloud forecast.');
 assert.deepEqual(hourly,original);
});
test('meteor cloud hours require complete coverage and weight fractional-offset forecast intervals',()=>{
 const start=new Date('2026-12-14T00:00:00Z'),seconds=+start/1000;
 assert.equal(meteorHourCloud({time:[seconds-1800,seconds+1800],cloud_cover:[10,90]},start),50);
 assert.equal(meteorHourCloud({time:[seconds-900,seconds+2700],cloud_cover:[20,100]},start),40);
 assert.equal(meteorHourCloud({time:[seconds],cloud_cover:[0]},start),0);
 for(const hourly of [undefined,{time:[seconds-1800],cloud_cover:[10]},{time:[seconds-1800,seconds+1800],cloud_cover:[10,null]},{time:[seconds-1800,seconds+5400],cloud_cover:[10,90]},{time:[seconds-1800,seconds+1800],cloud_cover:[10,101]}])assert.equal(meteorHourCloud(hourly,start),null);
 const event=meteorEvents.find(event=>event.name==='Geminids'),place={name:'Polar QA',latitude:90,longitude:0,timezone:'UTC'},baseline=meteorConditions(event,2026,place);
 const first=baseline.window?.start??baseline.moonIlluminationTime;assert(first);
 const t=+first/1000,conditions=meteorConditions(event,2026,place,{time:[t-1800,t+1800],cloud_cover:[10,90]});
 assert.equal(conditions.cloudForecastHours,1);assert.equal(conditions.cloudCover,50);assert(conditions.cloudSampleHours>1);
 assert.match(meteorCloudSummary(conditions),/Partial coverage/);
});

test('upcoming meteor cards contain no year-10000 occurrence at the final supported date',()=>{
 assert.deepEqual(upcomingMeteorOccurrences(utcDate(9999,11,31,12),'UTC'),[]);
});
test('late final-year planning keeps only remaining supported annual occurrences',()=>{
 const january=upcomingMeteorOccurrences(utcDate(9999,0,6),'UTC');assert.equal(january.length,6);assert(!january.some(plan=>plan.event.name==='Quadrantids'));assert(january.every(plan=>plan.year===9999));
 const december=upcomingMeteorOccurrences(utcDate(9999,11,1),'Europe/London');assert.equal(december.length,1);assert.equal(december[0].event.name,'Geminids');assert.equal(december[0].year,9999);
});
test('ordinary upcoming meteor ordering and year rollover remain available',()=>{
 const plans=upcomingMeteorOccurrences(utcDate(2026,9,12),'Europe/London');assert.equal(plans.length,7);assert.equal(plans[0].event.name,'Orionids');assert.equal(plans[0].year,2026);assert.equal(plans.find(plan=>plan.event.name==='Quadrantids').year,2027);
 assert(plans.every((plan,index)=>index===0||+plan.peak>+plans[index-1].peak));
});
test('supported early meteor occurrences preserve year one and reject invalid planner dates',()=>{
 const plans=upcomingMeteorOccurrences(utcDate(1,0,1),'UTC');assert.equal(plans.length,7);assert.equal(plans[0].peak.toISOString(),'0001-01-04T00:00:00.000Z');
 for(const date of [new Date(NaN),utcDate(0,0,1),utcDate(10000,0,1)])assert.throws(()=>upcomingMeteorOccurrences(date),/UTC years 1–9999/);
});

test('meteor illumination is tied to a remaining dark hour, including Moon-up and polar daylight cases',async()=>{
 const {isAstronomicalNight,moonInfo}=await vite.ssrLoadModule('/lib/sky.ts');
 const london={name:'London',latitude:51.5,longitude:0,timezone:'UTC'},quadrantids=meteorEvents.find(event=>event.name==='Quadrantids');
 const moonUp=meteorConditions(quadrantids,2026,london);assert(moonUp.darkHours>0);assert.equal(moonUp.moonFreeHours,0);assert.equal(moonUp.window,null);assert(moonUp.moonIlluminationTime);assert(isAstronomicalNight(moonUp.moonIlluminationTime,london));assert.equal(moonUp.moonIllumination,moonInfo(moonUp.moonIlluminationTime,london).illumination);
 const polar={name:'North Pole',latitude:90,longitude:0,timezone:'UTC'},perseids=meteorEvents.find(event=>event.name==='Perseids'),day=meteorConditions(perseids,2026,polar);assert.equal(day.darkHours,0);assert.equal(day.moonIllumination,null);assert.equal(day.moonIlluminationTime,null);
});
