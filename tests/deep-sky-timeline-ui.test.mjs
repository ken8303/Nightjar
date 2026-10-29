import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {default:Timeline}=await vite.ssrLoadModule('/components/deep-sky-timeline.tsx');
const render=suns=>renderToStaticMarkup(createElement(Timeline,{name:'M31',place:{name:'Fixture',latitude:51.5,longitude:0,timezone:'UTC'},onDate:()=>{},samples:suns.map((sun,index)=>({time:new Date(Date.parse('2026-10-24T00:00Z')+index*900000),sun,altitude:30+index,azimuth:180,ra:0,dec:0}))}));
const count=(html,tag)=>(html.match(new RegExp(`<${tag}\\b`,'g'))||[]).length;
const isolated=html=>(html.match(/class="deep-sky-isolated-marker"/g)||[]).length;
test('isolated dark samples remain visible without joining across bright gaps',()=>{
 const html=render([-19,0,-19]);
 assert.equal(isolated(html),2);assert.equal(count(html,'rect'),0);
 const path=html.match(/<path d="([^"]*)"/)[1];assert.equal((path.match(/M/g)||[]).length,2);assert(!path.includes('L'));
});
test('shading only joins adjacent dark samples and does not extend into twilight',()=>{
 const html=render([-19,-19,-18,0,-19]);
 assert.equal(count(html,'rect'),1);assert.equal(isolated(html),1);
});
test('single dark samples render as points; exact -18 and brighter samples stay omitted',()=>{
 assert.equal(isolated(render([-19])),1);
 for(const suns of [[-18],[0],[-18,0,-6]]){
  const html=render(suns);assert.equal(isolated(html),0);assert.equal(count(html,'rect'),0);
  assert(!html.includes('aria-label="View M31 at'));
 }
});

test('polar twilight between dark samples breaks both curve and shading',async()=>{
 const {A,observer,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
 const place={name:'Polar grazing fixture',latitude:84.56058967678678,longitude:0,timezone:'UTC'};
 const transit=A.SearchHourAngle(A.Body.Sun,observer(place),0,new Date('2026-12-21T00:00Z')).time.date;
 const samples=[-450000,450000].map(offset=>{const time=new Date(+transit+offset);return {time,sun:sunAltitude(time,place),altitude:40,azimuth:0,ra:0,dec:0}});
 assert(samples.every(sample=>sample.sun<-18));assert(sunAltitude(transit,place)>-18);
 const html=renderToStaticMarkup(createElement(Timeline,{name:'M81',place,samples,onDate:()=>{}}));
 assert.equal(count(html,'rect'),0,'shading must not bridge the twilight crossing');
 assert.equal(isolated(html),2,'both remaining dark samples must stay visible');
 assert(!html.match(/<path d="([^"]*)"/)[1].includes('L'));
});

test('graph summary reports only the highest fully dark sample',()=>{
 const html=render([-19,0,-19]);assert.match(html,/Highest dark sample:/);assert.match(html,/<strong>32\.0°<\/strong>/);assert(html.includes('dateTime="2026-10-24T00:30:00.000Z"'));assert(html.includes('Use this sampled time')); assert(html.includes('30° guide'));assert(html.includes('Continuous darkness'));
 const bright=render([-18,0]);assert(bright.includes('No fully dark samples in this window.'));assert(!bright.includes('Highest dark sample:'));assert(!bright.includes('Use this sampled time'));
});

test('selected-time marker appears only when the starting instant is fully dark',()=>{
 const dark=render([-19,-19]);assert(dark.includes('deep-sky-selected-marker'));assert(dark.includes('Selected time'));
 for(const sun of [-18,-6,0]){const html=render([sun,-19]);assert(!html.includes('deep-sky-selected-marker'));assert(!html.includes('deep-sky-key-selected'))}
});

test('graph marks the highest dark sample and labels a below-horizon peak',()=>{
 const html=render([-19,0,-19]);assert.match(html,/deep-sky-peak-marker/);assert.match(html,/left:100%;top:/);
 assert(!render([-18,0]).includes('deep-sky-peak-marker'));
 const below=renderToStaticMarkup(createElement(Timeline,{name:'Southern object',place:{name:'Fixture',latitude:51.5,longitude:0,timezone:'UTC'},onDate:()=>{},samples:[{time:new Date('2026-10-24T00:00Z'),sun:-19,altitude:-12,azimuth:180,ra:0,dec:0}]}));
 assert(below.includes('Below horizon'));assert(below.includes('deep-sky-peak-marker'));
});
