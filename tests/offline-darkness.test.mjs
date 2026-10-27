import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {createServer} from './vite-test-server.mjs';
import {offlineDarkness} from '../public/offline-darkness.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {darknessSummaryLines}=await vite.ssrLoadModule('/lib/darkness-remaining.ts');
test('offline darkness matches planner calculations across day, darkness and polar sites',()=>{
 for(const latitude of [51.5,90,-90])for(const time of ['2026-10-27T00:00:00.000Z','2026-06-21T12:00:00.000Z','2026-12-21T12:00:00.000Z']){
  const site={name:'Fixture',latitude,longitude:0,timezone:'UTC'};assert.deepEqual(offlineDarkness(time,site),darknessSummaryLines(new Date(time),site));
 }
 assert.throws(()=>offlineDarkness('bad',{latitude:0,longitude:0}));
});
test('checked-in offline calculator is reproducible from the locked astronomy dependency',async()=>{
 const result=await build({absWorkingDir:root,entryPoints:['lib/offline-darkness.ts'],bundle:true,format:'esm',platform:'browser',alias:{'@':root},minify:true,legalComments:'inline',outfile:'public/offline-darkness.mjs',write:false});
 assert.deepEqual(Buffer.from(result.outputFiles[0].contents),await readFile(new URL('../public/offline-darkness.mjs',import.meta.url)));
});
test('offline calculation excludes times at and after astronomical dawn',async()=>{
 const {A,observer,sunAltitude}=await vite.ssrLoadModule('/lib/sky.ts');
 const site={name:'London',latitude:51.5,longitude:0,timezone:'UTC'};
 const dawn=A.SearchAltitude(A.Body.Sun,observer(site),1,new Date('2026-10-27T00:00:00.000Z'),1,-18).date;
 const before=new Date(+dawn-1000),after=new Date(+dawn+1000);
 assert(sunAltitude(before,site)<-18);assert(sunAltitude(after,site)>-18);
 assert.match(offlineDarkness(before.toISOString(),site)[0],/Full darkness remaining:/);
 assert.match(offlineDarkness(after.toISOString(),site)[0],/outside full astronomical darkness/);
});
