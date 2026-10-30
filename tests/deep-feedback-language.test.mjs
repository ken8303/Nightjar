import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {deepFeedback}=await vite.ssrLoadModule('/lib/deep-feedback-language.ts');
const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
const en=createTranslator('en'),zh=createTranslator('zh-Hant');
test('deep-sky list feedback translates and preserves catalogue identifiers',()=>{
 for(const [key,message] of Object.entries(englishMessages).filter(([key,value])=>key.startsWith('deepFeedback.')&&!value.includes('{'))){assert.equal(deepFeedback(message,en),message,key);assert.notEqual(deepFeedback(message,zh),message,key)}
 assert.equal(deepFeedback('M31 restored to your deep-sky list.',zh),'已將 M31 還原至深空清單。');
 assert.equal(deepFeedback('Unexpected storage diagnostic',zh),'Unexpected storage diagnostic');
});
