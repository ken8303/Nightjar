import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {calendarFeedback}=await vite.ssrLoadModule('/lib/calendar-feedback-language.ts');
const {plannerFeedback}=await vite.ssrLoadModule('/lib/planner-feedback-language.ts');
const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
const en=createTranslator('en'),zh=createTranslator('zh-Hant');
test('known calendar errors and meteor notices follow the current language',()=>{
 for(const [,message] of Object.entries(englishMessages).filter(([key])=>key.startsWith('calendar.error'))){assert.equal(calendarFeedback(message,en),message);assert.notEqual(calendarFeedback(message,zh),message)}
 for(const key of ['meteor.downloaded','meteor.downloadFailed']){const message=englishMessages[key];assert.equal(plannerFeedback(message,en),message);assert.equal(plannerFeedback(message,zh),zh(key))}
 assert.equal(calendarFeedback('Provider diagnostic',zh),'Provider diagnostic');
});
