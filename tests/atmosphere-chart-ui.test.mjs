import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},esbuild:{jsx:'automatic'},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {default:AtmosphereDetails}=await vite.ssrLoadModule('/components/atmosphere-details.tsx');
test('cloud layer chart distinguishes zero, partial and unavailable forecasts',()=>{
 const date=new Date('2026-10-27T00:00Z'),hourly={time:[+date/1000],cloud_cover_high:[0],cloud_cover_mid:[65],cloud_cover_low:[null]};
 const html=renderToStaticMarkup(createElement(AtmosphereDetails,{hourly,date,timezone:'UTC',loading:false}));
 assert(html.includes('width:0%'));assert(html.includes('width:65%'));assert(html.includes('cloud-layer-bar unavailable'));assert(html.includes('Unavailable'));assert(html.includes('50%'));
});
