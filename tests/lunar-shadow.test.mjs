import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {lunarShadow,lunarShadowSamples,lunarShadowOverlap}=await vite.ssrLoadModule('/lib/lunar-shadow.ts');
const {nextLunarEclipses,lunarEclipseContacts}=await vite.ssrLoadModule('/lib/lunar-events.ts');
const {isAstronomicalNight}=await vite.ssrLoadModule('/lib/sky.ts');
test('shadow geometry matches Astronomy Engine contact boundaries for penumbral, partial and total eclipses',()=>{
 let events=nextLunarEclipses(new Date('2025-01-01T00:00:00Z'));
 for(let year=2027;new Set(events.map(e=>e.kind)).size<3&&year<2040;year+=2)events.push(...nextLunarEclipses(new Date(`${year}-01-01T00:00:00Z`)));
 assert(new Set(events.map(e=>e.kind)).size>=3);
 for(const event of events){
  const contacts=lunarEclipseContacts(event),peak=lunarShadow(event.peak.date),radius=Math.hypot(peak.x,peak.y);
  assert(radius<peak.penumbra+1);if(event.kind!=='penumbral')assert(radius<peak.umbra+1);if(event.kind==='total')assert(radius+1<peak.umbra);
  assert(Math.abs(lunarShadowOverlap(radius,peak.umbra)-event.obscuration)<.005,`${event.kind} peak coverage`);
  for(const contact of contacts){const s=lunarShadow(contact.time),r=Math.hypot(s.x,s.y);let expected;if(contact.label.startsWith('Penumbral'))expected=s.penumbra+1;else if(contact.label.startsWith('Partial'))expected=s.umbra+1;else if(contact.label.startsWith('Totality'))expected=s.umbra-1;else continue;assert(Math.abs(r-expected)<0.02,`${event.kind} ${contact.label}: ${r} vs ${expected}`)}
 }
});
test('disc overlap handles disjoint, full and concentric shadows',()=>{
 assert.equal(lunarShadowOverlap(3,2),0);assert.equal(lunarShadowOverlap(0,2),1);assert.equal(lunarShadowOverlap(0,.5),.25);assert.throws(()=>lunarShadowOverlap(NaN,1));
});
test('simulation samples contain exact eligible contacts and only fully dark instants',()=>{
 const event=nextLunarEclipses(new Date('2026-01-01T00:00:00Z'))[0];
 for(const place of [{name:'London',latitude:51.5,longitude:0},{name:'South pole',latitude:-90,longitude:0}]){
  const samples=lunarShadowSamples(event,place),contacts=lunarEclipseContacts(event);
  assert(samples.every((sample,i)=>isAstronomicalNight(sample,place)&&(i===0||+samples[i-1]<+sample)));
  for(const c of contacts)if(isAstronomicalNight(c.time,place))assert(samples.some(sample=>+sample===+c.time));
 }
});
test('closely spaced exact samples display their distinct milliseconds',async()=>{
 const {deepSkyTimestampFormatter}=await vite.ssrLoadModule('/lib/deep-sky-time.ts');
 const first=new Date('2026-08-28T02:33:23.786Z'),second=new Date('2026-08-28T02:33:36.001Z'),format=deepSkyTimestampFormatter(first,'UTC','en-GB','millisecond').format;
 assert.notEqual(format(first),format(second));assert.match(format(first),/23[.,]786/);assert.match(format(second),/36[.,]001/);
 const event=nextLunarEclipses(new Date('2026-08-28T02:00:00Z'))[0],site={name:'London',latitude:51.5,longitude:0};
 const samples=lunarShadowSamples(event,site,second);assert(samples.some(time=>+time===+first));assert(samples.some(time=>+time===+second));
});
