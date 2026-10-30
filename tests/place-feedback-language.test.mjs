import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {placeFeedback}=await vite.ssrLoadModule('/lib/place-feedback-language.ts');
const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
const en=createTranslator('en'),zh=createTranslator('zh-Hant');
test('known saved-site and location feedback follows the current language',()=>{
 for(const [key,message] of Object.entries(englishMessages).filter(([key,value])=>key.startsWith('feedback.')&&!value.includes('{'))){
  assert.equal(placeFeedback(message,en),message,key);assert.notEqual(placeFeedback(message,zh),message,key);
 }
});
test('parameterized feedback preserves user names literally and unknown errors remain intact',()=>{
 const place='山谷 {rating}';
 assert.equal(placeFeedback(`${place} removed from saved places. You can undo during this visit.`,zh),`已從儲存地點中移除 ${place}。本次瀏覽期間可復原。`);
 assert.equal(placeFeedback(`Bortle class 4 saved for ${place} on this device.`,zh),`已在此裝置為 ${place} 儲存波特爾 4 級。`);
 assert.equal(placeFeedback('Provider diagnostic: try later',zh),'Provider diagnostic: try later');
});
