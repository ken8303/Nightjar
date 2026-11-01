import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {skyHorizonPath}=await vite.ssrLoadModule('/lib/sky-horizon.ts');
const {default:SkyChart}=await vite.ssrLoadModule('/components/sky-chart.tsx');
const {default:SkyDome}=await vite.ssrLoadModule('/components/sky-dome.tsx');
const site={name:'London',latitude:51.5,longitude:0,timezone:'UTC'},date=new Date('2026-10-27T00:00:00Z');
test('atlas horizon path uses the north-up and east-left projection and closes at the seam',()=>{
 const path=skyHorizonPath([0,0,30,0,0,0,0,0]);assert(path.startsWith('M220.000 29.000'));assert(path.includes('L109.333 195.000'));assert(path.endsWith('L220.000 29.000 Z'));
 assert.throws(()=>skyHorizonPath([0]));
});
test('both atlas views hide obstructed targets without changing the default flat sky',()=>{
 const props={place:site,date,selected:'',showLines:true,showLabels:true,showMilkyWay:false,onSelect:()=>{}};
 const chart=renderToStaticMarkup(createElement(SkyChart,{...props,large:true})),blocked=renderToStaticMarkup(createElement(SkyChart,{...props,large:true,horizon:Array(8).fill(90)}));
 assert((chart.match(/data-sky-name=/g)||[]).length>0);assert.equal((blocked.match(/data-sky-name=/g)||[]).length,0);assert.match(blocked,/sky-local-horizon/);assert.doesNotMatch(chart,/sky-local-horizon/);
 const dome=renderToStaticMarkup(createElement(SkyDome,props)),blockedDome=renderToStaticMarkup(createElement(SkyDome,{...props,horizon:Array(8).fill(90)}));
 assert((dome.match(/class="sky-dome-label"/g)||[]).length>0);assert.equal((blockedDome.match(/class="sky-dome-label"/g)||[]).length,0);assert.match(blockedDome,/approximate local horizon/);
 const selectedDome=renderToStaticMarkup(createElement(SkyDome,{...props,selected:'Vega',horizon:Array(8).fill(90)}));assert.match(selectedDome,/Below the applied local horizon/);
 const partial=renderToStaticMarkup(createElement(SkyChart,{...props,large:true,horizon:Array(8).fill(20)}));assert.doesNotMatch(partial,/data-sky-name="Vega"/);assert.match(partial,/data-sky-name="Capella"/);
 const partialDome=renderToStaticMarkup(createElement(SkyDome,{...props,horizon:Array(8).fill(20)}));assert.doesNotMatch(partialDome,/class="sky-dome-label"[^>]*>Vega</);assert.match(partialDome,/class="sky-dome-label"[^>]*>Capella</);
});
