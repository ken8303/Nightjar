import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {bestDeepSkySample,deepSkyRecommendations,deepSkyCatalogue}=await vite.ssrLoadModule('/lib/deep-sky.ts');
test('deep-sky best samples respect an applied local horizon',()=>{
 const time=new Date('2026-10-27T00:00:00Z');
 const samples=[{time,altitude:50,azimuth:0,sun:-30},{time:new Date(+time+900000),altitude:40,azimuth:180,sun:-30}];
 assert.equal(bestDeepSkySample(samples),samples[0]);
 assert.equal(bestDeepSkySample(samples,[60,0,0,0,0,0,0,0]),samples[1]);
 assert.equal(bestDeepSkySample(samples,Array(8).fill(90)),null);
});
test('dark-sky catalogue recommendations do not include obstructed objects',()=>{
 const date=new Date('2026-10-27T00:00:00Z'),place={name:'London',latitude:51.5,longitude:0};
 const targets=deepSkyCatalogue.slice(0,20),clear=deepSkyRecommendations(targets,date,place),blocked=deepSkyRecommendations(targets,date,place,Array(8).fill(90));
 assert(clear.size>0);assert.equal(blocked.size,0);
});

test('planet recommendations exclude horizon-obstructed samples',async()=>{
 const {rankVisibilitySamples}=await vite.ssrLoadModule('/lib/visibility-window.ts');const t=new Date('2026-10-27T00:00Z');
 const north={time:t,sun:-30,altitude:50,azimuth:0},south={time:new Date(+t+3600000),sun:-30,altitude:40,azimuth:180};
 const rows=[{body:'Mars',positions:[north,south]}];
 assert.equal(rankVisibilitySamples(rows)[0].peakSample,north);
 assert.equal(rankVisibilitySamples(rows,[60,0,0,0,0,0,0,0])[0].peakSample,south);
 assert.equal(rankVisibilitySamples(rows,Array(8).fill(90)).length,0);
});
