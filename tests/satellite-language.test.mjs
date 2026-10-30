import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {satelliteStatusLabel}=await vite.ssrLoadModule('/lib/satellite-language.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
test('satellite warnings preserve details and follow the selected language',()=>{
 const en=createTranslator('en'),zh=createTranslator('zh-Hant');
 const stale='Cached orbital data is more than six hours old. Refresh it before using satellite directions.';
 assert.equal(satelliteStatusLabel(stale,'en',en),stale);assert.match(satelliteStatusLabel(stale,'zh-Hant',zh),/超過六小時/);
 assert.match(satelliteStatusLabel('Orbital provider returned HTTP 503. Automatic refresh is paused for investigation.','zh-Hant',zh),/HTTP 503/);
 assert.match(satelliteStatusLabel('This ISS window leaves full astronomical darkness. Recalculate passes before downloading.','zh-Hant',zh),/不在完全天文黑夜/);
 assert.match(satelliteStatusLabel('The shared orbital cache could not be read. Automatic refresh is paused for investigation.','zh-Hant',zh),/暫停自動更新/);
 const unknown='Provider supplied additional detail';assert.equal(satelliteStatusLabel(unknown,'zh-Hant',zh),unknown);
});
