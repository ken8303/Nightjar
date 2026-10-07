import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {observingWindowCalendar,lunarEclipseCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
const created=new Date('2026-10-07T20:00Z'),start=new Date('2026-10-25T00:30Z');
const forecast={start,hours:2,place:'Shared site name',timezone:'Europe/London',latitude:51.5,longitude:0,score:84,cloud:20,moonAbove:false,moonIllumination:.2};
const eclipse={kind:'partial',peak:new Date('2026-10-25T01:00:00.333Z'),place:'Shared site name',latitude:51.5,longitude:0,timezone:'Europe/London',contacts:[{label:'Penumbral begins',time:new Date('2026-10-25T00:00:00.987Z'),altitude:30},{label:'Greatest eclipse',time:new Date('2026-10-25T01:00:00.333Z'),altitude:40},{label:'Penumbral ends',time:new Date('2026-10-25T02:00:00.123Z'),altitude:20}]};
const unfold=text=>text.replace(/\r\n /g,''),uid=text=>unfold(text).split('\r\n').find(line=>line.startsWith('UID:'));
test('same-named sites have different forecast and eclipse event identities, while repeated exports remain stable',()=>{
 for(const [input,calendar] of [[forecast,observingWindowCalendar],[eclipse,lunarEclipseCalendar]]){const before=structuredClone(input),one=calendar(input,created),two=calendar({...input,longitude:1},created);assert.notEqual(uid(one),uid(two));assert.equal(uid(one),uid(calendar(input,new Date('2026-10-08T20:00Z'))));assert(unfold(one).includes('GEO:51.5;0'));assert.deepEqual(input,before)}
 assert.notEqual(uid(observingWindowCalendar({...forecast,place:'😀'},created)),uid(observingWindowCalendar({...forecast,place:'😁'},created)));
});
test('forecast UTC durations survive clock changes and milliseconds stay within the supplied interval',()=>{
 const text=unfold(observingWindowCalendar(forecast,created));assert(text.includes('DTSTART:20261025T003000Z'));assert(text.includes('DTEND:20261025T023000Z'));
 const precise=unfold(observingWindowCalendar({...forecast,start:new Date('2026-10-25T00:30:00.987Z')},created));assert(precise.includes('DTSTART:20261025T003001Z'));assert(precise.includes('DTEND:20261025T023000Z'));
 assert.throws(()=>observingWindowCalendar({...forecast,start:new Date('9999-12-31T23:30Z')},created),/supported calendar years/);assert.throws(()=>observingWindowCalendar({...forecast,start:new Date('0000-01-01T00:00Z')},created),/Invalid/);
});
test('eclipse event seconds enclose all fractional contacts and notes preserve the original instants',()=>{
 const text=unfold(lunarEclipseCalendar(eclipse,created));assert(text.includes('DTSTART:20261025T000000Z'));assert(text.includes('DTEND:20261025T020001Z'));assert(text.includes('2026-10-25T02:00:00.123Z'));assert(text.includes('TRANSP:TRANSPARENT'));
});
test('invalid contact chains, coordinates and peak metadata cannot produce misleading eclipse events',()=>{
 for(const patch of [{peak:new Date('2026-10-25T03:00Z')},{kind:''},{contacts:[...eclipse.contacts].reverse()},{contacts:eclipse.contacts.map((c,i)=>i===1?{...c,altitude:91}:c)},{contacts:eclipse.contacts.map((c,i)=>i===1?{...c,time:new Date(NaN)}:c)}])assert.throws(()=>lunarEclipseCalendar({...eclipse,...patch},created),/Invalid/);
 for(const calendar of [input=>observingWindowCalendar({...forecast,...input},created),input=>lunarEclipseCalendar({...eclipse,...input},created)])for(const patch of [{latitude:91},{longitude:181},{latitude:NaN},{longitude:undefined}])assert.throws(()=>calendar(patch),/coordinates/);
 assert.throws(()=>lunarEclipseCalendar(eclipse,new Date(NaN)),/Invalid/);
});
test('calendar metadata keeps Unicode within 75-byte content lines and legacy coordinate-free calls remain accepted',()=>{
 for(const [input,calendar] of [[forecast,observingWindowCalendar],[eclipse,lunarEclipseCalendar]]){const text=calendar({...input,place:'星空'.repeat(80)+'; \nSite'},created);for(const line of text.split('\r\n'))assert(new TextEncoder().encode(line).length<=75);assert(unfold(text).includes('\\nSite'));const legacy={...input};delete legacy.latitude;delete legacy.longitude;assert.doesNotThrow(()=>calendar(legacy,created));assert(!unfold(calendar(legacy,created)).includes('GEO:'))}
});
