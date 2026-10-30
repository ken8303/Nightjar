import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {brightFeedback}=await vite.ssrLoadModule('/lib/bright-feedback-language.ts');
const {englishMessages}=await vite.ssrLoadModule('/lib/messages/en.ts');
const {createTranslator}=await vite.ssrLoadModule('/lib/messages/index.ts');
const en=createTranslator('en'),zh=createTranslator('zh-Hant');
test('saved-target and note recovery feedback follows the selected language',()=>{
 const keys=['bright.statusNotesReadFailed','bright.statusRecoveryFailed','bright.statusVersionsUnavailable','bright.statusReviewSaveFailed','bright.statusTargetsReadFailed','bright.statusTargetsUnavailable','bright.statusTargetChangeFailed','bright.statusUndoFailed','bright.statusInvalidList','bright.statusNotesLarge','bright.statusOriginalUnavailable','bright.statusRecoveryTime'];
 for(const key of keys){const message=englishMessages[key];assert.equal(brightFeedback(message,'en',en),message,key);assert.equal(brightFeedback(message,'zh-Hant',zh),zh(key),key)}
 const combined=englishMessages['bright.statusNotesReadFailed']+' '+englishMessages['bright.statusSaveSuffix'];assert.match(brightFeedback(combined,'zh-Hant',zh),/無法讀取已儲存天體筆記/);assert.match(brightFeedback(combined,'zh-Hant',zh),/無法儲存/);assert.equal(brightFeedback('Unexpected storage diagnostic','zh-Hant',zh),'Unexpected storage diagnostic');
});
