import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {parseAurora,validateAuroraFeed,nearestAurora,auroraIsStale}=await vite.ssrLoadModule('/lib/aurora.ts');
const now=new Date('2026-10-06T20:00:00Z'),cells=Array.from({length:100},(_,i)=>[i,60,20]);
const raw={'Observation Time':'2026-10-06T19:50:00Z','Forecast Time':'2026-10-06T20:30:00Z',coordinates:cells};
test('provider and browser aurora formats share valid cells and canonical timestamps',()=>{
 const feed=parseAurora(raw,now);assert.deepEqual(validateAuroraFeed(feed),{...feed,observedAt:'2026-10-06T19:50:00.000Z',forecastAt:'2026-10-06T20:30:00.000Z'});assert.equal(auroraIsStale(feed,+now),false);assert.equal(auroraIsStale(feed,+now+3*3600000),true);assert.deepEqual(nearestAurora([[359,60,10],[10,60,50]],60,-1),[359,60,10]);
});
test('malformed browser feeds are rejected before dates or grids reach rendering',()=>{
 const feed=parseAurora(raw,now);
 for(const value of [null,{},raw,{...feed,observedAt:'invalid'},{...feed,forecastAt:null},{...feed,fetchedAt:''},{...feed,cells:null},{...feed,cells:cells.slice(0,99)},{...feed,cells:[...cells,[0,91,20]]},{...feed,cells:[...cells,[0,60,101]]},{...feed,cells:[...cells,[NaN,60,20]]},{...feed,cells:Array(100001).fill([0,60,20])}])assert.throws(()=>validateAuroraFeed(value),/Please retry/);
});
test('provider parser excludes invalid cells and refuses an unusable or oversized grid',()=>{
 assert.equal(parseAurora({...raw,coordinates:[...cells,[361,60,10],['0',60,10]]},now).cells.length,100);
 assert.throws(()=>parseAurora({...raw,coordinates:[...cells.slice(0,99),[0,91,20]]},now));assert.throws(()=>parseAurora({...raw,coordinates:Array(100001).fill([0,60,20])},now));
});
