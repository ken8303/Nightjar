import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {readViewingModeChange,viewingModeKey}=await vite.ssrLoadModule('/lib/viewing-mode.ts');
test('queued older preference and clear events use the current stored display value',()=>{
 let current='on';const storage={getItem:key=>{assert.equal(key,viewingModeKey);return current}};
 for(const key of [viewingModeKey,null]){
  assert.equal(readViewingModeChange({key,newValue:'off',storageArea:storage},()=>storage),true);
  current='off';assert.equal(readViewingModeChange({key,newValue:'on',storageArea:storage},()=>storage),false);
  current='on';
 }
 current=null;assert.equal(readViewingModeChange({key:viewingModeKey,newValue:'on',storageArea:storage},()=>storage),false);
});
test('denied storage getters and reads preserve the display rather than throwing or implying off',()=>{
 const storage={getItem:()=>{throw new DOMException('Denied','SecurityError')}};
 assert.equal(readViewingModeChange({key:viewingModeKey,storageArea:storage},()=>{throw new DOMException('Denied','SecurityError')}),null);
 assert.equal(readViewingModeChange({key:null,storageArea:storage},()=>storage),null);
});
test('unrelated keys and other storage areas do not update or read the preference',()=>{
 const storage={getItem:()=>assert.fail('unrelated storage must not be read')};
 assert.equal(readViewingModeChange({key:'nightjar-equipment',storageArea:storage},()=>assert.fail('unrelated keys need no storage access')),null);
 for(const storageArea of [null,{getItem:()=>null}])assert.equal(readViewingModeChange({key:viewingModeKey,storageArea},()=>storage),null);
});
