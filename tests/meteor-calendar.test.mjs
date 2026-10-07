import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {utcDate}=await vite.ssrLoadModule('/lib/utc-date.ts');
const {meteorCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
const {nextMeteorYear,meteorEvents,meteorConditions}=await vite.ssrLoadModule('/lib/meteor-planning.ts');
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
test('remaining meteor windows exclude elapsed and partial hours without modifying full-window calculations',()=>{
 const event=meteorEvents.find(event=>event.name==='Orionids'),place={name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'};
 const full=meteorConditions(event,2026,place),from=new Date('2026-10-22T01:15:00Z'),remaining=meteorConditions(event,2026,place,undefined,from);
 assert(full.darkHours>remaining.darkHours);assert(remaining.darkHours>0);
 if(remaining.window)assert(+remaining.window.start>=+from);
 assert.equal(remaining.moonIllumination,full.moonIllumination);
 const expired=meteorConditions(event,2026,place,undefined,new Date('2026-10-23T00:00Z'));
 assert.equal(expired.darkHours,0);assert.equal(expired.moonFreeHours,0);assert.equal(expired.window,null);assert.equal(expired.cloudCover,null);
});
test('a complete sampled meteor hour cannot extend beyond local noon in a fractional-offset zone',()=>{
 const event=meteorEvents.find(event=>event.name==='Geminids'),place={name:'Polar clock QA',latitude:90,longitude:0,timezone:'Asia/Kathmandu'};
 const conditions=meteorConditions(event,2026,place);assert(conditions.darkHours>0);
 if(conditions.window)assert(+conditions.window.end<=+new Date('2026-12-14T06:15:00Z'));
 const lastHour=meteorConditions(event,2026,place,undefined,new Date('2026-12-14T06:00:00Z'));
 assert.equal(lastHour.darkHours,0);assert.equal(lastHour.window,null);
});
