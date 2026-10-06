import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {viewerZoomKey}=await vite.ssrLoadModule('/lib/viewer-zoom.ts');
test('viewer keyboard zoom steps through 100–300 percent and stays within bounds',()=>{
 let zoom=1;
 for(const expected of [1.5,2,2.5,3,3,3]){zoom=viewerZoomKey(zoom,'+');assert.equal(zoom,expected)}
 for(const expected of [2.5,2,1.5,1,1,1]){zoom=viewerZoomKey(zoom,'-');assert.equal(zoom,expected)}
 assert.equal(viewerZoomKey(1,'='),1.5);assert.equal(viewerZoomKey(3,'0'),1);
});
test('viewer shortcuts leave navigation and unrelated keys to the browser',()=>{
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Escape','Home','End','a'])assert.equal(viewerZoomKey(2,key),undefined);
});
