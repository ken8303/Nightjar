import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {default:HourlyForecast}=await vite.ssrLoadModule('/components/hourly-forecast.tsx');
test('forecast bars distinguish a zero score from unavailable data',()=>{
 const hours=[{date:new Date('2026-10-27T00:00Z'),score:0,cloud:100,temp:0},{date:new Date('2026-10-27T01:00Z'),score:null,cloud:null,temp:null}];
 const html=renderToStaticMarkup(createElement(HourlyForecast,{hours,timezone:'UTC',onDate:()=>{}}));
 assert(html.includes('score 0 out of 100, 100% cloud cover, 0 degrees Celsius'));
 assert(html.includes('score unavailable, cloud cover unavailable, temperature unavailable'));
 assert(html.includes('class="bar unavailable"'));assert(html.includes('class="bar"'));assert(html.includes('Cloud unavailable'));assert(!html.includes('—% cloud'));
});
test('forecast cloud symbols distinguish zero cloud, partial cloud and missing data',()=>{
 const render=cloud=>renderToStaticMarkup(createElement(HourlyForecast,{hours:[{date:new Date('2026-10-27T00:00Z'),score:cloud===null?null:70,cloud,temp:10}],timezone:'UTC',onDate:()=>{}}));
 const clear=render(0);assert.match(clear,/lucide-star/);assert.doesNotMatch(clear,/lucide-cloud/);assert.match(clear,/0% cloud/);
 for(const cloud of [1,50,100]){const html=render(cloud);assert.match(html,/lucide-cloud/);assert.doesNotMatch(html,/lucide-star/);assert(html.includes(`${cloud}% cloud`))}
 const missing=render(null);assert.doesNotMatch(missing,/lucide-(?:star|cloud)/);assert.match(missing,/Cloud unavailable/);
});
