import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {languageBootstrap}=await vite.ssrLoadModule('/lib/language-bootstrap.ts');
test('startup language follows a supported saved preference and tolerates unavailable storage',()=>{
 for(const [value,expected] of [['zh-Hant','zh-Hant'],['en','en'],['unknown','en'],[null,'en']]){const document={documentElement:{lang:'en'}};runInNewContext(languageBootstrap,{document,localStorage:{getItem:key=>{assert.equal(key,'nightjar-language-v1');return value}}});assert.equal(document.documentElement.lang,expected)}
 const document={documentElement:{lang:'en'}};runInNewContext(languageBootstrap,{document,localStorage:{getItem:()=>{throw Error('denied')}}});assert.equal(document.documentElement.lang,'en');
});
