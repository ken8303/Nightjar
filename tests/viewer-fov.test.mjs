import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {viewerVerticalFov}=await vite.ssrLoadModule('/lib/viewer-fov.ts');
const rad=Math.PI/180;
test('square and landscape viewers retain their existing vertical field of view',()=>{
 for(const baseline of [38,44])for(const aspect of [1,16/9,2])assert.equal(viewerVerticalFov(baseline,aspect),baseline);
});
test('portrait projection preserves the baseline horizontal field and fits the default lunar sphere',()=>{
 for(const baseline of [38,44])for(const aspect of [235/320,.5,.75,.01]){
  const vertical=viewerVerticalFov(baseline,aspect),horizontal=2*Math.atan(Math.tan(vertical*rad/2)*aspect)/rad;
  assert(Math.abs(horizontal-baseline)<1e-9);assert(vertical>=baseline&&vertical<180);
  const moonDiameter=2*Math.asin(1/3.6)/rad;assert(moonDiameter<Math.min(horizontal,vertical));
 }
});
test('invalid projection parameters are rejected before creating a nonfinite camera matrix',()=>{
 for(const baseline of [0,-1,180,NaN,Infinity])assert.throws(()=>viewerVerticalFov(baseline,.75));
 for(const aspect of [0,-1,NaN,Infinity])assert.throws(()=>viewerVerticalFov(38,aspect));
});
