import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {satelliteJavaScriptOnly}=await vite.ssrLoadModule('/build/satellite-javascript.ts');
test('the pinned package keeps all JS exports while its unused WASM entry is excluded',async()=>{
 const plugin=satelliteJavaScriptOnly(),source=await readFile(root+'node_modules/satellite.js/dist/index.js','utf8');
 const result=plugin.transform(source,root+'node_modules/satellite.js/dist/index.js');
 assert.equal(result.code,source.replace("export * from './wasm/index.js';",''));
 for(const api of ['json2satrec','propagate','eciToEcf','ecfToLookAngles','gstime'])assert(result.code.includes(api));
 assert.equal(plugin.transform(source,root+'lib/satellite-position.ts'),null);
 assert.throws(()=>plugin.transform('changed package entry',root+'node_modules/satellite.js/dist/index.js'),/Review the pinned/);
});
