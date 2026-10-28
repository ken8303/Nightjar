import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {nextLunarPhases,nextLunarEclipses}=await vite.ssrLoadModule('/lib/lunar-events.ts');
const {validObservingDate}=await vite.ssrLoadModule('/lib/observing-time.ts');
test('modern lunar events are ordered, complete and selectable within the supported planner range',()=>{
 const date=new Date('2026-10-11T20:00:00Z'),original=+date;
 const phases=nextLunarPhases(date),eclipses=nextLunarEclipses(date);
 assert.equal(phases.length,4);assert.equal(eclipses.length,3);
 for(const rows of [phases.map(event=>event.time.date),eclipses.map(event=>event.peak.date)]){
  assert(rows.every(time=>validObservingDate(time)&&+time>=+date));
  assert(rows.every((time,index)=>!index||+time>+rows[index-1]));
 }
 assert.deepEqual(phases.map(event=>event.quarter),[1,2,3,0]);assert.equal(phases[0].time.date.toISOString().slice(0,10),'2026-10-18');assert.equal(eclipses[0].peak.date.toISOString().slice(0,10),'2027-02-20');assert.equal(+date,original);
});
test('upper-year boundaries keep remaining events and never expose expanded-year shortcuts',()=>{
 for(const value of ['9999-12-15T00:00:00Z','9999-12-31T23:59:00Z']){
  const date=new Date(value),phases=nextLunarPhases(date),eclipses=nextLunarEclipses(date);
  assert(phases.every(event=>validObservingDate(event.time.date)));assert(eclipses.every(event=>validObservingDate(event.peak.date)));
  if(value.startsWith('9999-12-15')){assert(phases.length>0);assert(phases.length<4)}else{assert.equal(phases.length,0);assert.equal(eclipses.length,0)}
 }
});
test('early supported years remain intact and unsupported inputs are rejected',()=>{
 const date=new Date('0001-01-01T00:00:00Z');assert.equal(nextLunarPhases(date).length,4);assert.equal(nextLunarEclipses(date).length,3);
 for(const value of ['0000-12-31T23:59:00Z','+010000-01-01T00:00:00Z','invalid']){
  assert.throws(()=>nextLunarPhases(new Date(value)),/UTC years 1–9999/);assert.throws(()=>nextLunarEclipses(new Date(value)),/UTC years 1–9999/);
 }
});
test('an ongoing eclipse stays available through its final contact and expires after its minute',()=>{
 const first=nextLunarEclipses(new Date('2026-10-11T20:00:00Z'))[0];
 const end=+first.peak.date+first.sd_penum*60000;
 for(const instant of [+first.peak.date,+first.peak.date+60001,Math.floor(end),Math.floor(end)+59999])assert.equal(+nextLunarEclipses(new Date(instant))[0].peak.date,+first.peak.date);
 assert(+nextLunarEclipses(new Date(Math.ceil(end)+60001))[0].peak.date>+first.peak.date);
});
