import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {compareDeepSky,deepSkyOpportunity}=await vite.ssrLoadModule('/lib/deep-sky-comparison.ts');
const {findDeepSky,deepSkyWindow,bestDeepSkySample}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const place={name:'London',latitude:51.508,longitude:-.126,timezone:'Europe/London'},date=new Date('2026-10-05T20:00Z');
test('comparison uses the same astronomical samples, sorts highest eligible peaks first and limits computation',()=>{
 const targets=['M31','M45','M57'].map(id=>findDeepSky(id,'')[0]),rows=compareDeepSky(targets,date,place);
 assert.equal(rows.length,3);
 for(const row of rows){const reference=deepSkyWindow(row.target,date,place);assert.deepEqual(row.samples.map(sample=>{const original={...sample};delete original.moonAltitude;return original}),reference);const best=bestDeepSkySample(reference);assert.equal(row.best?.altitude,best?.altitude);assert.equal(+row.best?.time,+best?.time);assert.equal(row.samples.length,97)}
 for(let i=1;i<rows.length;i++)assert((rows[i-1].best?.altitude??-Infinity)>=(rows[i].best?.altitude??-Infinity));
 assert.throws(()=>compareDeepSky(Array(7).fill(targets[0]),date,place));assert.deepEqual(compareDeepSky([],date,place),[]);
 assert(compareDeepSky(targets,new Date('2026-06-21T12:00Z'),{name:'North pole',latitude:89,longitude:0}).every(row=>!row.best&&row.minutes===0));
});
test('opportunity intervals exclude threshold samples and gaps, split windows and retain isolated peaks',()=>{
 const sample=(index,altitude=40,sun=-19)=>({time:new Date(+date+index*900000),altitude,sun,azimuth:0,ra:0,dec:0});
 const result=deepSkyOpportunity([sample(0),sample(1),sample(2,30),sample(3),sample(4),sample(5,50,-18),sample(6,80)]);
 assert.equal(result.minutes,30);assert.equal(result.windows.length,2);assert.equal(result.windows[0].minutes,15);assert.equal(result.best.altitude,80);
 assert.equal(deepSkyOpportunity([sample(0),sample(2)]).minutes,0);assert.equal(deepSkyOpportunity([sample(0,30)]).best,null);assert.equal(deepSkyOpportunity([]).minutes,0);
});
test('clock-change comparisons preserve absolute durations and distinguish repeated local hours',()=>{
 const rows=compareDeepSky([findDeepSky('M31','')[0]],new Date('2026-10-25T00:00Z'),place),row=rows[0];
 const stamp=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London',timeZoneName:'shortOffset'});
 assert.notEqual(stamp.format(row.samples[0].time),stamp.format(row.samples[4].time));
 for(const window of row.windows)assert.equal(window.minutes,(+window.end-+window.start)/60000);
});
test('deep-sky comparison shares bounded dates with individual windows at the final supported year',()=>{
 const targets=['M31','M45'].map(id=>findDeepSky(id,'')[0]),start=new Date('9999-12-31T23:30:00Z');
 for(const row of compareDeepSky(targets,start,place)){
  assert.equal(row.samples.length,2);assert(row.samples.every(sample=>sample.time.getUTCFullYear()===9999));
  assert.deepEqual(row.samples.map(({moonAltitude,...sample})=>{assert(Number.isFinite(moonAltitude));return sample}),deepSkyWindow(row.target,start,place));
  assert(row.windows.every(window=>window.start.getUTCFullYear()===9999&&window.end.getUTCFullYear()===9999));if(row.best)assert.equal(row.best.time.getUTCFullYear(),9999);
 }
 assert.throws(()=>compareDeepSky(targets,new Date('+010000-01-01T00:00:00Z'),place),/UTC years 1–9999/);
});

test('comparison windows exclude a brief polar twilight crossing between dark samples',async()=>{
 const {A,observer,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
 const site={name:'Polar grazing fixture',latitude:84.56058967678678,longitude:0};
 const transit=A.SearchHourAngle(A.Body.Sun,observer(site),0,new Date('2026-12-21T00:00Z')).time.date;
 const start=new Date(+transit-450000),end=new Date(+transit+450000);
 assert(sunAltitude(start,site)<-18);assert(sunAltitude(end,site)<-18);assert(sunAltitude(transit,site)>-18);
 const row=compareDeepSky([findDeepSky('M81','')[0]],start,site)[0];
 assert(row.samples[0].altitude>30&&row.samples[1].altitude>30);
 assert(row.best,'dark samples remain available as individual opportunities');
 assert(!row.windows.some(window=>+window.start<+transit&&+window.end>+transit),'an observing window must not bridge twilight');
});
