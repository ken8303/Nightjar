import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {rankVisibilitySamples,planetVisibilityWindow}=await vite.ssrLoadModule('/lib/visibility-window.ts');
const london={name:'London',latitude:51.5074,longitude:-.1278,timezone:'Europe/London'};
const sample=(altitude,sun=-18,hour=0)=>({time:new Date(Date.UTC(2026,9,3,hour)),altitude,sun,azimuth:180});
test('visibility rows strictly exclude 30 degrees and below, with stable highest-first ordering',()=>{
 const rows=[{body:'Saturn',positions:[sample(30)]},{body:'Venus',positions:[sample(29.99)]},{body:'Mars',positions:[sample(30.01)]},{body:'Moon',positions:[sample(60)]},{body:'Jupiter',positions:[sample(60)]},{body:'Empty',positions:[]}];
 const before=structuredClone(rows),ranked=rankVisibilitySamples(rows);
 assert.deepEqual(ranked.map(row=>row.body),['Jupiter','Moon','Mars']);
 assert.deepEqual(rows,before,'ranking must not change the original samples');
});
test('daylight peaks determine ranking while shortcuts require altitude above 30 and Sun at or below -6',()=>{
 const rows=[{body:'Moon',positions:[sample(70,15,1),sample(50,-5.99,2),sample(30,-18,3),sample(45,-6,4)]},{body:'Mars',positions:[sample(65,-18)]},{body:'Venus',positions:[sample(55,10)]}];
 const ranked=rankVisibilitySamples(rows);
 assert.deepEqual(ranked.map(row=>row.body),['Moon','Mars','Venus']);
 assert.equal(ranked[0].peak,70);assert.equal(ranked[0].peakSample.sun,15);
 assert.equal(ranked[0].best.altitude,45);assert.equal(ranked[0].best.sun,-6);
 assert.equal(ranked[2].best,null,'a daytime opportunity must not be offered as an after-twilight shortcut');
});
test('London astronomical fixture includes daytime peaks and excludes low Venus',()=>{
 const data=planetVisibilityWindow(Date.parse('2026-10-03T20:00:00Z'),london);
 assert.deepEqual(data.rows.map(row=>row.body),['Moon','Uranus','Mars','Jupiter','Saturn','Neptune']);
 const expected={Moon:62.8,Mars:58.2,Jupiter:48.7,Saturn:40.5};
 for(const [name,peak] of Object.entries(expected))assert(Math.abs(data.rows.find(row=>row.body===name).peak-peak)<.2,`${name} peak differs from the reference window`);
 assert(data.rows[0].peakSample.sun>-6);assert(data.rows.find(row=>row.body==='Saturn').best.sun<=-6);
 assert(!data.rows.some(row=>row.body==='Mercury'||row.body==='Venus'));
 for(const row of data.rows)assert(row.peak>30);
});
test('a polar site can have no eligible object without creating placeholder rows',()=>{
 const data=planetVisibilityWindow(Date.parse('2026-10-03T20:00:00Z'),{name:'North Pole',latitude:90,longitude:0});
 assert.equal(data.hours.length,12);assert.deepEqual(data.rows,[]);
});
test('hourly UTC samples remain distinct through the repeated local hour at the UK clock change',()=>{
 const data=planetVisibilityWindow(Date.parse('2026-10-25T00:00:00Z'),london);
 const local=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:london.timezone});
 assert.equal(local.format(data.hours[0].time),'01:00');assert.equal(local.format(data.hours[1].time),'01:00');
 assert.equal(new Set(data.hours.map(hour=>+hour.time)).size,12);
 assert.equal(data.hours.at(-1).time.toISOString(),'2026-10-25T11:00:00.000Z');
 data.hours.slice(1).forEach((hour,i)=>assert.equal(+hour.time-+data.hours[i].time,3600000));
});
