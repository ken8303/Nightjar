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
test('isolated dark samples remain visible without joining across bright gaps',()=>{
 const html=render([-19,0,-19]);
 assert.equal(count(html,'circle'),2);assert.equal(count(html,'rect'),0);
 const path=html.match(/<path d="([^"]*)"/)[1];assert.equal((path.match(/M/g)||[]).length,2);assert(!path.includes('L'));
});
test('shading only joins adjacent dark samples and does not extend into twilight',()=>{
 const html=render([-19,-19,-18,0,-19]);
 assert.equal(count(html,'rect'),1);assert.equal(count(html,'circle'),1);
});
test('single dark samples render as points; exact -18 and brighter samples stay omitted',()=>{
 assert.equal(count(render([-19]),'circle'),1);
 for(const suns of [[-18],[0],[-18,0,-6]]){
  const html=render(suns);assert.equal(count(html,'circle'),0);assert.equal(count(html,'rect'),0);
  assert(!html.includes('aria-label="View M31 at'));
 }
});
