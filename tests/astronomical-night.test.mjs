import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {isAstronomicalNight,nextAstronomicalDarkness,nextObservingTime,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
const london={name:'London',latitude:51.5,longitude:0};
test('night eligibility depends on the exact instant and site, not the clock label',()=>{
 const noon=new Date('2026-10-24T12:00Z'),midnight=new Date('2026-10-24T00:00Z');
 assert.equal(isAstronomicalNight(noon,london),false);assert.equal(isAstronomicalNight(midnight,london),true);
 assert.equal(isAstronomicalNight(noon,{...london,longitude:180}),true);
 assert.equal(isAstronomicalNight(new Date(NaN),london),false);
});
test('darkness recovery selects strictly below -18 and preserves an already dark instant',()=>{
 const from=new Date('2026-10-24T12:00Z'),before=+from,next=nextAstronomicalDarkness(from,london);
 assert(next);assert(+next>+from);assert(sunAltitude(next,london)<-18);assert.equal(+from,before);
 assert.equal(+nextAstronomicalDarkness(next,london),+next);
});
test('polar summer never falls back to twilight and polar winter retains genuine darkness',()=>{
 const pole={name:'North Pole',latitude:90,longitude:0},summer=new Date('2026-06-21T12:34Z'),winter=new Date('2026-12-21T12:34Z');
 assert.equal(nextAstronomicalDarkness(summer,pole),null);assert.equal(+nextObservingTime(summer,pole),+summer);
 assert.equal(isAstronomicalNight(summer,pole),false);assert.equal(isAstronomicalNight(winter,pole),true);
 assert(isAstronomicalNight(nextObservingTime(winter,pole),pole));
});
test('darkness search respects the final supported date rather than overflowing',()=>{
 const from=new Date('9999-12-31T23:59:59.999Z');
 for(const longitude of [0,180]){const next=nextAstronomicalDarkness(from,{...london,longitude});if(next){assert(+next<=+from);assert(isAstronomicalNight(next,{...london,longitude}))}}
});
