import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {coordinateEntryValue,coordinateEntryPoint,coordinateInputDraft,coordinateIsNegative,coordinateMagnitude,withCoordinateHemisphere,coordinateEntryMatchesPoint}=await vite.ssrLoadModule('/lib/coordinate-entry.ts');
test('hemisphere controls let unsigned decimal entry retain south and west without double-negating pasted signs',()=>{
 const south=withCoordinateHemisphere('',true);assert.equal(south,'-');assert.equal(coordinateMagnitude(south),'');assert.equal(coordinateEntryPoint(south,'0'),null);
 const typed=coordinateInputDraft('33.8',coordinateIsNegative(south));assert.equal(typed,'-33.8');assert.equal(coordinateEntryValue(typed,'latitude'),-33.8);
 assert.equal(coordinateInputDraft('−33.8',false),'-33.8');assert.equal(coordinateInputDraft('-33.8',true),'-33.8');assert.equal(coordinateInputDraft('+33.8',true),'33.8');assert.equal(withCoordinateHemisphere('-33.8',false),'33.8');
 assert.equal(coordinateInputDraft('33.',true),'-33.');assert.equal(coordinateMagnitude('-33.'),'33.');
});
test('decimal comma and normalized pasted digits retain the intended numerical coordinates',()=>{
 assert.equal(coordinateEntryValue('−33,8','latitude'),-33.8);assert.equal(coordinateEntryValue(' １２３．４５ ','longitude'),123.45);assert.equal(coordinateEntryValue('1e-5','latitude'),.00001);
 const point=coordinateEntryPoint('-33,8','151.2093');assert.deepEqual(point,{name:'-33.800°, 151.209°',latitude:-33.8,longitude:151.2093});
});
test('compound signs stay invalid through typing and hemisphere changes instead of silently choosing a location',()=>{
 for(const text of ['+-33.8','+ -33.8','+−33.8','−+33.8','--33.8','＋－３３．８']){
  for(const negative of [false,true]){
   const typed=coordinateInputDraft(text,negative);
   assert.equal(coordinateEntryValue(typed,'latitude'),null,text);
   assert.equal(coordinateEntryPoint(typed,'0'),null,text);
   assert.equal(coordinateEntryValue(withCoordinateHemisphere(typed,negative),'latitude'),null,text);
  }
 }
});
test('zero and poles stay valid while blanks, partial values and malformed formats cannot become coordinates',()=>{
 assert.equal(coordinateEntryValue('0','latitude'),0);assert.equal(coordinateEntryValue('-90','latitude'),-90);assert.equal(coordinateEntryValue('180','longitude'),180);
 assert(Object.is(coordinateEntryValue('-0','longitude'),-0));
 for(const text of ['', ' ', '-', '+', '−', '1e', 'NaN', 'Infinity', '0x10', '1,2,3', '33°', '91', '-90.001'])assert.equal(coordinateEntryValue(text,'latitude'),null,text);
 assert.equal(coordinateEntryValue('180.01','longitude'),null);assert.equal(coordinateEntryPoint('0',''),null);
});
test('only a matching submitted point consumes a draft; newer and incomplete coordinates remain separate',()=>{
 const submitted=coordinateEntryPoint('-33.8','151.2093');assert(coordinateEntryMatchesPoint('-33.800','151.209300',submitted));
 assert(!coordinateEntryMatchesPoint('-33.80001','151.2093',submitted));assert(!coordinateEntryMatchesPoint('-','151.2093',submitted));assert(!coordinateEntryMatchesPoint('-33.8','151.2094',submitted));
 assert(coordinateEntryMatchesPoint('-0','0',{latitude:0,longitude:0}));
});
