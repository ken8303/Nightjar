import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {rankVisibilitySamples,planetVisibilityWindow,visibilityOpportunities}=await vite.ssrLoadModule('/lib/visibility-window.ts');
const london={name:'London',latitude:51.5074,longitude:-.1278,timezone:'Europe/London'};
const sample=(altitude,sun=-19,hour=0)=>({time:new Date(Date.UTC(2026,9,3,hour)),altitude,sun,azimuth:180});
test('visibility rows strictly exclude 30 degrees and below, with stable highest-first ordering',()=>{
 const rows=[{body:'Saturn',positions:[sample(30)]},{body:'Venus',positions:[sample(29.99)]},{body:'Mars',positions:[sample(30.01)]},{body:'Moon',positions:[sample(60)]},{body:'Jupiter',positions:[sample(60)]},{body:'Empty',positions:[]}];
 const before=structuredClone(rows),ranked=rankVisibilitySamples(rows);
 assert.deepEqual(ranked.map(row=>row.body),['Jupiter','Moon','Mars']);
 assert.deepEqual(rows,before,'ranking must not change the original samples');
});
test('daylight, twilight and the exact -18 boundary cannot rank or supply shortcuts',()=>{
 const ranked=rankVisibilitySamples([
  {body:'Moon',positions:[sample(80,15),sample(70,-6),sample(60,-18),sample(40,-18.001)]},
  {body:'Mars',positions:[sample(65,-19)]},{body:'Venus',positions:[sample(90,10)]},
 ]);
 assert.deepEqual(ranked.map(row=>row.body),['Mars','Moon']);
 assert.equal(ranked[1].peak,40);assert.equal(ranked[1].best.sun,-18.001);
 assert(ranked.every(row=>row.positions.every(p=>p.sun< -18)));
});
test('London planet window contains only full-darkness samples and ranks their peaks',()=>{
 const data=planetVisibilityWindow(Date.parse('2026-10-03T20:00:00Z'),london);
 assert.equal(data.sampleCount,12);assert(data.hours.length>0&&data.hours.length<12);
 assert(data.hours.every(hour=>hour.sun< -18));
 assert(data.rows.length>0);
 data.rows.forEach((row,index)=>{
  assert(row.peak>30);assert.equal(row.peak,Math.max(...row.positions.map(p=>p.altitude)));
  assert(row.positions.every(p=>p.sun< -18));assert(row.best.sun< -18);
  if(index)assert(data.rows[index-1].peak>=row.peak);
 });
});
test('a polar site can have no eligible object without creating placeholder rows',()=>{
 const data=planetVisibilityWindow(Date.parse('2026-10-03T20:00:00Z'),{name:'North Pole',latitude:90,longitude:0});
 assert.equal(data.sampleCount,12);assert.equal(data.hours.length,0);assert.deepEqual(data.rows,[]);
});
test('hourly UTC samples remain distinct through the repeated local hour at the UK clock change',()=>{
 const data=planetVisibilityWindow(Date.parse('2026-10-25T00:00:00Z'),london);
 const local=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:london.timezone});
 assert.equal(local.format(data.hours[0].time),'01:00');assert.equal(local.format(data.hours[1].time),'01:00');
 assert.equal(new Set(data.hours.map(hour=>+hour.time)).size,data.hours.length);assert(data.hours.length>=2);
 assert(data.hours.every(hour=>hour.sun< -18));
 data.hours.slice(1).forEach((hour,i)=>assert.equal(+hour.time-+data.hours[i].time,3600000));
});
test('visibility samples stop at the supported UTC year boundary',()=>{
 const data=planetVisibilityWindow(Date.parse('9999-12-31T22:00:00Z'),london);
 assert.deepEqual(data.hours.map(hour=>hour.time.toISOString()),['9999-12-31T22:00:00.000Z','9999-12-31T23:00:00.000Z']);
 for(const row of data.rows){assert.equal(row.positions.length,2);assert(row.positions.every(p=>p.time.getUTCFullYear()===9999));assert(row.peakSample.time.getUTCFullYear()===9999);if(row.best)assert(row.best.time.getUTCFullYear()===9999)}
 const first=planetVisibilityWindow(Date.parse('0001-01-01T00:00:00Z'),london);assert.equal(first.sampleCount,12);assert(first.hours.every(hour=>hour.sun< -18));assert.equal(first.hours[0].time.toISOString(),'0001-01-01T00:00:00.000Z');
});
test('unsupported visibility start dates fail before creating actionable times',()=>{
 for(const start of [NaN,Date.parse('+010000-01-01T00:00:00Z'),Date.parse('0000-12-31T23:00:00Z')])assert.throws(()=>planetVisibilityWindow(start,london),/UTC years 1–9999/);
});

test('full-darkness opportunities preserve descending altitude and stable ties',()=>{
 const ranked=rankVisibilitySamples([
  {body:'Jupiter',positions:[sample(70,10),sample(38,-19,1)]},
  {body:'Saturn',positions:[sample(40,-19,1)]},
  {body:'Mars',positions:[sample(40,-19,1)]},
  {body:'Venus',positions:[sample(60,10),sample(30,-19,1)]},
 ]),before=structuredClone(ranked),opportunities=visibilityOpportunities(ranked);
 assert.deepEqual(ranked.map(row=>row.body),['Mars','Saturn','Jupiter']);
 assert.deepEqual(opportunities.map(row=>row.body),['Mars','Saturn','Jupiter']);
 assert(opportunities.every(row=>row.best.altitude>30&&row.best.sun< -18));
 assert.deepEqual(ranked,before);
});
