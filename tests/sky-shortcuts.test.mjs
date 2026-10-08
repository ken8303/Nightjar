import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readSkyShortcutHash,skyShortcutSections}=await vite.ssrLoadModule('/lib/sky-shortcuts.ts');
test('known sky shortcuts reopen their exact named sections including encoded fragments',()=>{
 for(const [id,label] of skyShortcutSections){assert.deepEqual(readSkyShortcutHash('#'+id),{id,label});assert.deepEqual(readSkyShortcutHash('#'+id.replace('-','%2D')),{id,label})}
});
test('unknown, oversized and malformed fragments do not redirect planner startup',()=>{
 for(const hash of [null,undefined,{},'', 'visibility-planner','#','#places','#visibility-planner?next=sky','#%E0%A4','#'+ 'a'.repeat(256)])assert.equal(readSkyShortcutHash(hash),null);
});
