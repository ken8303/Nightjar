import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {A,bodyPosition,hourBelowAltitude}=await vite.ssrLoadModule('/lib/sky.ts');

test('a brief Moon ascent between quarter-hour samples cannot count as a Moon-free hour',()=>{
 const place={name:'Brief lunar ascent',latitude:62.123953956451714,longitude:-53.656755201860676},start=new Date('2026-10-16T20:00:00.000Z');
 for(let minute=0;minute<=60;minute+=15)assert(bodyPosition(A.Body.Moon,new Date(+start+minute*60000),place).altitude<0);
 assert(bodyPosition(A.Body.Moon,new Date('2026-10-16T20:10:45.129Z'),place).altitude>0);
 assert.equal(hourBelowAltitude(A.Body.Moon,start,place,0),false);
 // Nearby ordinary hours remain available and no input metadata changes.
 const before=structuredClone(place);
 assert.equal(hourBelowAltitude(A.Body.Moon,new Date(+start-3600000),place,0),true);
 assert.deepEqual(place,before);
});
test('altitude thresholds reject invalid bounds and handle the apparent zenith without an unbounded inverse',()=>{
 const place={name:'London',latitude:51.5,longitude:0},start=new Date('2026-10-16T20:00:00.000Z');
 for(const threshold of [NaN,Infinity,-Infinity,-91,91])assert.equal(hourBelowAltitude(A.Body.Sun,start,place,threshold),false);
 for(const threshold of [89.99999,90])assert.equal(hourBelowAltitude(A.Body.Sun,start,place,threshold),true);
 assert.equal(hourBelowAltitude(A.Body.Sun,start,place,-90),false);
 assert.equal(hourBelowAltitude(A.Body.Sun,new Date('invalid'),place,-18),false);
 assert.equal(hourBelowAltitude(A.Body.Sun,new Date('9999-12-31T23:00:00.000Z'),place,-18),false);
});


test('apparent Sun contours retain short-crossing protection independently of geometric twilight',()=>{
 const place={name:'Apparent solar contour',latitude:85.07938514866692,longitude:-2.4},start=new Date('2026-12-21T12:00:00.000Z');
 for(let minute=0;minute<=60;minute+=15)assert(bodyPosition(A.Body.Sun,new Date(+start+minute*60000),place).altitude<-18);
 assert(bodyPosition(A.Body.Sun,new Date('2026-12-21T12:07:38.712Z'),place).altitude>-18);
 assert.equal(hourBelowAltitude(A.Body.Sun,start,place,-18),false);
 assert.equal(hourBelowAltitude(A.Body.Sun,start,place,-18,'none'),true);
});
