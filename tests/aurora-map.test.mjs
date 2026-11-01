import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {auroraCellIsFullyDark}=await vite.ssrLoadModule('/lib/aurora-map.ts');
const {sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
test('shaded aurora cells are omitted in daylight and remain dark across their entire footprint',()=>{
 assert.equal(auroraCellIsFullyDark(new Date('2026-10-27T12:00:00Z'),51,0),false);
 assert.equal(auroraCellIsFullyDark(new Date('2026-10-27T00:00:00Z'),51,0),true);
 assert.equal(auroraCellIsFullyDark(new Date('invalid'),51,0),false);
 for(const time of ['2026-10-27T00:00:00Z','2026-06-21T00:00:00Z','2026-12-21T06:00:00Z'])for(const lat of [-80,-45,0,45,80])for(const lon of [-179,-90,0,90,179]){
  const date=new Date(time);if(!auroraCellIsFullyDark(date,lat,lon))continue;
  for(const dy of [-.5,.5])for(const dx of [-.5,.5])assert(sunAltitude(date,{name:'',latitude:lat+dy,longitude:lon+dx})< -18);
 }
});
