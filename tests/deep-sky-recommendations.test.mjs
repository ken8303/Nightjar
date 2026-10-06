import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {messierCatalogue,deepSkyRecommendations,bestDeepSkyTime}=await vite.ssrLoadModule('/lib/deep-sky.ts');
const {A,bodyPosition}=await vite.ssrLoadModule('/lib/sky.ts');
const london={name:'London',latitude:51.5085,longitude:-.1257,timezone:'Europe/London'};
test('shared catalogue recommendations agree with the independent per-object window',()=>{
 const start=new Date('2026-10-06T20:00Z'),targets=messierCatalogue.filter(t=>['M31','M45','M42','M57','M83'].includes(t.id));
 const recommendations=deepSkyRecommendations(targets,start,london);
 for(const target of targets){const expected=bestDeepSkyTime(target,start,london),actual=recommendations.get(target.id);if(expected)assert.deepEqual(actual,expected);else assert.equal(actual,undefined)}
 assert(recommendations.has('M31'));assert(!recommendations.has('M83'));
 for(const best of recommendations.values()){assert(best.altitude>30);assert(bodyPosition(A.Body.Sun,best.date,london).altitude<=-18);assert(+best.date>=+start&&+best.date<=+start+86400000)}
});
test('polar daylight produces no dark-sky suggestions and catalogue inputs are bounded',()=>{
 assert.equal(deepSkyRecommendations(messierCatalogue,new Date('2026-06-21T12:00Z'),{name:'Polar site',latitude:89,longitude:0}).size,0);
 assert.throws(()=>deepSkyRecommendations(Array(110).fill(messierCatalogue[0]),new Date(),london),/109/);
});
test('recommendations remain on UTC sample boundaries during repeated local clock hours',()=>{
 const start=new Date('2026-10-25T00:00Z'),recommendations=deepSkyRecommendations(messierCatalogue,start,london);
 assert(recommendations.size>0);
 for(const best of recommendations.values()){assert.equal((+best.date-+start)%900000,0);assert(best.altitude>30);assert(bodyPosition(A.Body.Sun,best.date,london).altitude<=-18)}
});
