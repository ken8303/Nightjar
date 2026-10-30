import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {diaryFeedback}=await vite.ssrLoadModule('/lib/diary-feedback-language.ts');
const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
const en=createTranslator('en'),zh=createTranslator('zh-Hant');
test('diary recovery and conflict feedback follows the selected language',()=>{
 for(const [key,message] of Object.entries(englishMessages).filter(([key,value])=>key.startsWith('diaryFeedback.')&&!value.includes('{'))){assert.equal(diaryFeedback(message,en),message,key);assert.notEqual(diaryFeedback(message,zh),message,key)}
});
test('diary feedback retains targets and plural counts and preserves unknown details',()=>{
 for(const [key,values] of [['diaryFeedback.limit',{count:300}],['diaryFeedback.copyOne',{count:1}],['diaryFeedback.copyMany',{count:2}],['diaryFeedback.formRestored',{target:'M31'}],['diaryFeedback.formConflict',{target:'M31'}],['diaryFeedback.observationRemoved',{target:'M31'}],['diaryFeedback.observationRestored',{target:'M31'}],['diaryFeedback.reportOne',{count:1}],['diaryFeedback.reportMany',{count:2}],['diaryFeedback.csvOne',{count:1}],['diaryFeedback.csvMany',{count:2}]]){
  const message=en(key,values);assert.equal(diaryFeedback(message,en),message,key);assert.equal(diaryFeedback(message,zh),zh(key,values),key);
 }
 assert.equal(diaryFeedback('Unexpected storage diagnostic',zh),'Unexpected storage diagnostic');
});
