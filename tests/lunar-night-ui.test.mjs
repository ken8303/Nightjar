import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {default:Eclipses}=await vite.ssrLoadModule('/components/lunar-eclipses.tsx');
const {nextLunarEclipses}=await vite.ssrLoadModule('/lib/lunar-events.ts');
const {isAstronomicalNight}=await vite.ssrLoadModule('/lib/sky.ts');
const sites=[{name:'London',latitude:51.5,longitude:0,timezone:'Europe/London'},{name:'Equator',latitude:0,longitude:120,timezone:'UTC'},{name:'North Pole',latitude:90,longitude:0,timezone:'UTC'},{name:'South Pole',latitude:-90,longitude:0,timezone:'UTC'}];
for(const place of sites)test(`eclipse contacts and shortcuts use actual dark event times at ${place.name}`,()=>{
 const date=new Date('2026-10-25T00:00Z'),events=nextLunarEclipses(date),eligible=events.filter(event=>isAstronomicalNight(event.peak.date,place));
 const html=renderToStaticMarkup(createElement(Eclipses,{date,place,onDate:()=>{}}));
 if(!eligible.length){assert(html.includes('None of the next supported lunar eclipses peaks in full astronomical darkness'));assert(!html.includes('Set observing time to peak'));return}
 assert.equal((html.match(/aria-pressed=/g)||[]).length,eligible.length);
 const event=eligible[0],offsets=[-event.sd_penum,...(event.sd_partial>0?[-event.sd_partial]:[]),...(event.sd_total>0?[-event.sd_total]:[]),0,...(event.sd_total>0?[event.sd_total]:[]),...(event.sd_partial>0?[event.sd_partial]:[]),event.sd_penum];
 const contacts=offsets.map(minutes=>new Date(+event.peak.date+minutes*60000));
 const displayed=[...html.matchAll(/dateTime="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(displayed,contacts.filter(time=>isAstronomicalNight(time,place)).map(time=>time.toISOString()));
 const download=[...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match=>match[0]).find(button=>button.includes('Download eclipse calendar'));assert(download);
 assert.equal(download.includes('disabled=""'),contacts.some(time=>!isAstronomicalNight(time,place)));
});
test('no lunar eclipse shortcut or calendar escapes the supported final instant',()=>{
 const html=renderToStaticMarkup(createElement(Eclipses,{date:new Date('9999-12-31T23:59:59.999Z'),place:sites[0],onDate:()=>{}}));
 assert(html.includes('None of the next supported lunar eclipses'));assert(!html.includes('Download eclipse calendar'));assert(!html.includes('<time'));
});

test('phase shortcuts omit bright events without changing the displayed event dates',async()=>{
 const {default:MoonExplorer}=await vite.ssrLoadModule('/components/moon-explorer.tsx');
 const {nextLunarPhases}=await vite.ssrLoadModule('/lib/lunar-events.ts');
 const {deepSkyTimestampFormatter}=await vite.ssrLoadModule('/lib/deep-sky-time.ts');
 const date=new Date('2026-10-25T00:00Z'),events=nextLunarPhases(date);
 for(const place of sites){
  const html=renderToStaticMarkup(createElement(MoonExplorer,{date,place,onDate:()=>{}}));
  const grid=html.match(/class="quarter-grid">([\s\S]*?)<\/div>/)[1],format=deepSkyTimestampFormatter(date,place.timezone).format;
  const eligible=events.filter(event=>isAstronomicalNight(event.time.date,place));
  assert.equal((grid.match(/<button\b/g)||[]).length,eligible.length);
  for(const event of events)assert.equal(grid.includes(format(event.time.date)),isAstronomicalNight(event.time.date,place));
  if(!eligible.length)assert(html.includes('None of the next supported lunar phases occurs in full astronomical darkness'));
 }
});

test('real polar eclipse cannot export a night-only interval that briefly crosses twilight between dark contacts',async()=>{
 const {A,observer,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
 const {lunarEclipseCalendar}=await vite.ssrLoadModule('/lib/calendar.ts');
 const place={name:'Polar eclipse fixture',latitude:86.26504344241616,longitude:136.10833333333335,timezone:'UTC'},date=new Date('2028-01-11T00:00Z');
 const event=nextLunarEclipses(date)[0];assert.equal(event.peak.date.toISOString(),'2028-01-12T04:13:00.859Z');
 const contacts=[-event.sd_penum,-event.sd_partial,0,event.sd_partial,event.sd_penum].map((minutes,index)=>({label:`Contact ${index}`,time:new Date(+event.peak.date+minutes*60000),altitude:0}));
 assert(contacts.every(contact=>isAstronomicalNight(contact.time,place)));
 const transit=A.SearchHourAngle(A.Body.Sun,observer(place),0,contacts[0].time).time.date;
 assert(+transit<+contacts.at(-1).time);assert(sunAltitude(transit,place)>-18);
 const html=renderToStaticMarkup(createElement(Eclipses,{date,place,onDate:()=>{}}));
 const button=[...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match=>match[0]).find(button=>button.includes('Download eclipse calendar'));
 assert(button.includes('disabled=""'));
 const input={kind:event.kind,peak:event.peak.date,place:place.name,latitude:place.latitude,longitude:place.longitude,contacts};
 assert.throws(()=>lunarEclipseCalendar({...input,nightOnly:true}),/leaves full astronomical darkness/);
 assert(lunarEclipseCalendar(input).includes('BEGIN:VCALENDAR'),'general astronomical date references keep their existing behavior');
});

test('lunar phase symbols distinguish new, quarters and full without claiming local orientation',async()=>{
 const {LunarPhaseSymbol}=await vite.ssrLoadModule('/components/moon-explorer.tsx');
 const icons=[0,1,2,3].map(quarter=>renderToStaticMarkup(createElement(LunarPhaseSymbol,{quarter})));
 assert.equal(new Set(icons).size,4);assert(!icons[0].includes('<path'));assert(!icons[2].includes('<path'));assert(icons[1].includes('A14 14 0 0 1'));assert(icons[3].includes('A14 14 0 0 0'));assert(icons.every(icon=>icon.includes('aria-hidden="true"')));
});

test('lunar illumination indicator matches the displayed percentage',async()=>{
 const {default:MoonExplorer}=await vite.ssrLoadModule('/components/moon-explorer.tsx');
 const {moonInfo}=await vite.ssrLoadModule('/lib/sky.ts');
 for(const date of [new Date('2026-10-25T00:00Z'),new Date('2026-11-09T00:00Z')]){
  const html=renderToStaticMarkup(createElement(MoonExplorer,{date,place:sites[0],onDate:()=>{}})),value=Math.round(moonInfo(date,sites[0]).illumination*100);
  assert(html.includes(`<strong>${value}%</strong><span>Illuminated</span>`));assert(html.includes(`style="width:${value}%"`));
 }
});
