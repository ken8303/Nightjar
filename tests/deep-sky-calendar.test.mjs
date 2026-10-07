import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {deepSkyWindowCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
const {compareDeepSky}=await vite.ssrLoadModule('/lib/deep-sky-comparison.ts');
const {messierCatalogue}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const target=messierCatalogue.find(t=>t.id==='M31'),place={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'},created=new Date('2026-10-07T20:00Z');
const unfold=text=>text.replace(/\r\n /g,'');
function fixture(start=new Date('2026-10-25T00:15:00Z')){const samples=Array.from({length:9},(_,i)=>({time:new Date(+start+i*900000),altitude:40+i,sun:-20,azimuth:90,moonAltitude:-10}));return {target,place,start,end:samples.at(-1).time,samples,moonBelowOnly:false}}
test('real deep-sky windows export bounded UTC events with an interval-specific peak and source metadata',()=>{
 const row=compareDeepSky([target],created,place,true)[0],window=row.windows[0],input={target,place,...window,samples:row.samples,moonBelowOnly:true},before=structuredClone(input),text=unfold(deepSkyWindowCalendar(input,created));
 assert(text.includes('BEGIN:VEVENT'));assert(text.includes('SUMMARY:Observe M31'));assert(text.includes('Moon centre at or below'));assert(text.includes('Catalogue J2000 coordinates'));assert(text.includes('STATUS:TENTATIVE'));assert(text.includes('GEO:51.5085;-0.1257'));assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,1);assert.deepEqual(input,before);
});
test('calendar events preserve elapsed UTC duration across a repeated local hour and round millisecond bounds inward',()=>{
 const f=fixture(),text=unfold(deepSkyWindowCalendar(f,created));assert(text.includes('DTSTART:20261025T001500Z'));assert(text.includes('DTEND:20261025T021500Z'));assert(text.includes('altitude 48.0 degrees'));
 const precise=fixture(new Date('2026-10-25T00:15:00.987Z')),rounded=unfold(deepSkyWindowCalendar(precise,created));assert(rounded.includes('DTSTART:20261025T001501Z'));assert(rounded.includes('DTEND:20261025T021500Z'));assert(rounded.includes('2026-10-25T00:15:00.987Z'));
});
test('calendar generation refuses gaps, duplicate samples, boundary failures and Moon-up samples under the requested filter',()=>{
 for(const patch of [f=>{f.samples.splice(4,1)},f=>{f.samples[4]=f.samples[3]},f=>{f.samples[4].altitude=30},f=>{f.samples[4].sun=-17.99},f=>{f.samples[4].altitude=NaN},f=>{f.samples[4].altitude=91},f=>{f.moonBelowOnly=true;f.samples[4].moonAltitude=.001}]){const f=fixture();patch(f);assert.throws(()=>deepSkyWindowCalendar(f,created),/qualifying/)}
 const f=fixture();f.samples[4].moonAltitude=50;assert.doesNotThrow(()=>deepSkyWindowCalendar(f,created));
});
test('Unicode content folds within 75 bytes, text cannot inject properties, and event identity distinguishes sites and constraints',()=>{
 const f=fixture();f.place={...place,name:'星空'.repeat(50)+'; \nBEGIN:VEVENT, \\'};const raw=deepSkyWindowCalendar(f,created),text=unfold(raw);
 for(const line of raw.split('\r\n'))assert(new TextEncoder().encode(line).length<=75);assert.equal((text.match(/^BEGIN:VEVENT$/gm)||[]).length,1);assert(text.includes('\\nBEGIN:VEVENT'));assert(text.includes('\\;'));assert(text.includes('\\,'));
 const uid=t=>unfold(t).split('\r\n').find(line=>line.startsWith('UID:'));assert.equal(uid(raw),uid(deepSkyWindowCalendar(f,created)));assert.notEqual(uid(raw),uid(deepSkyWindowCalendar({...f,place:{...f.place,longitude:1}},created)));assert.notEqual(uid(raw),uid(deepSkyWindowCalendar({...f,moonBelowOnly:true},created)));assert.notEqual(uid(deepSkyWindowCalendar({...f,place:{...place,name:'😀'}},created)),uid(deepSkyWindowCalendar({...f,place:{...place,name:'😁'}},created)));
});
test('invalid targets, sites, calendar years and intervals cannot generate misleading events',()=>{
 for(const patch of [{target:{...target,id:'M102'}},{place:{...place,latitude:91}},{start:new Date(NaN)},{end:new Date('2026-10-25T00:15Z')},{end:new Date('2026-10-26T02:15Z')},{target:{...target,ra:24}}])assert.throws(()=>deepSkyWindowCalendar({...fixture(),...patch},created),/Invalid/);
 const early=fixture(new Date('0099-10-25T00:15Z'));assert(unfold(deepSkyWindowCalendar(early,created)).includes('DTSTART:00991025T001500Z'));assert.throws(()=>deepSkyWindowCalendar(fixture(new Date('0000-10-25T00:15Z')),created),/Invalid/);assert.throws(()=>deepSkyWindowCalendar(fixture(),new Date(NaN)),/Invalid/);
});
