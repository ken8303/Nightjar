import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {weatherFeedback}=await vite.ssrLoadModule('/lib/weather-feedback-language.ts');
const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
const en=createTranslator('en'),zh=createTranslator('zh-Hant');
test('forecast failures follow the selected language without hiding unknown details',()=>{
 for(const [,message] of Object.entries(englishMessages).filter(([key])=>key.startsWith('weatherError.'))){assert.equal(weatherFeedback(message,en),message);assert.notEqual(weatherFeedback(message,zh),message)}
 assert.equal(weatherFeedback('Provider detail: station unavailable',zh),'Provider detail: station unavailable');
});
