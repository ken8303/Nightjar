import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {skyTargetAlias,skyTargetTranslationNames}=await vite.ssrLoadModule('/lib/language.ts');
const {deepSkyChineseName,deepSkyTranslationIds}=await vite.ssrLoadModule('/lib/deep-sky-names.ts');
test('offline bright-target labels are generated from the shared Traditional Chinese catalogue',async()=>{
 const html=await readFile(new URL('../public/offline.html',import.meta.url),'utf8'),match=html.match(/const offlineSkyNames=([^\n]*);/);assert(match);
 const expected=Object.fromEntries(skyTargetTranslationNames.map(name=>[name,skyTargetAlias(name,'zh-Hant')]).filter(([,label])=>label));assert.deepEqual(JSON.parse(match[1]),expected);assert.equal(expected.Vega,'織女星');assert.equal(expected.Moon,'月球');
 const deep=html.match(/const offlineDeepSkyNames=([^\n]*);/);assert(deep);assert.deepEqual(JSON.parse(deep[1]),Object.fromEntries(deepSkyTranslationIds.map(id=>[id,deepSkyChineseName(id)]).filter(([,label])=>label)));assert.equal(JSON.parse(deep[1]).M31,'仙女座星系');
});
