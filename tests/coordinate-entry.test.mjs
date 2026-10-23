import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {coordinateEntryValue,coordinateEntryPoint,coordinateInputDraft,coordinateIsNegative,coordinateMagnitude,withCoordinateHemisphere,coordinateEntryMatchesPoint,coordinatePairDraft}=await vite.ssrLoadModule('/lib/coordinate-entry.ts');
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
test('decimal-comma fractions and exponents use the same bounds as decimal points without inventing empty numbers',()=>{
 for(const [text,expected] of [[',5',.5],['−,5',-.5],['33,',33],['0,',0],['1,5e1',15],['+,５',.5]])assert.equal(coordinateEntryValue(text,'latitude'),expected,text);
 for(const text of [',','-,','+,','1,e','1,2,3','1,5e2',',5e3','1 234,5'])assert.equal(coordinateEntryValue(text,'latitude'),null,text);
 assert.equal(coordinateEntryValue('-1,8e2','longitude'),-180);
 assert.equal(coordinateEntryValue('-1,81e2','longitude'),null);
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

test('pasted coordinate pairs preserve precision, explicit hemispheres and zero',()=>{
 for(const [text,expected] of [
  ['51.508512345, -0.125712345',{latitude:'51.508512345',longitude:'-0.125712345'}],
  [' (−33.8, 151.2093) ',{latitude:'-33.8',longitude:'151.2093'}],
  ['＋１２．５, −０．２５',{latitude:'+12.5',longitude:'-0.25'}],
  ['-0, +0',{latitude:'-0',longitude:'+0'}],
  ['-90, 180',{latitude:'-90',longitude:'180'}],
  ['1e-5, -1.8e2',{latitude:'1e-5',longitude:'-1.8e2'}],
 ])assert.deepEqual(coordinatePairDraft(text),expected,text);
});
test('single decimal commas and malformed or out-of-bounds pairs cannot replace both fields',()=>{
 for(const text of ['51,5','51.5,-0.1','51.5,','51.5, ','(51.5, -0.1','51.5, -0.1)','91, 0','0, 181','51.5, -0.1, 3','51.5 N, 0.1 W','NaN, 0','Infinity, 0','51,5, -0,1','+-33.8, 151.2','0x10, 0','1e, 0','1'.repeat(201)+', 0','0'.repeat(81)+', 0','0, '+'0'.repeat(81)])assert.equal(coordinatePairDraft(text),null,text);
 assert.equal(coordinateEntryValue('51,5','latitude'),51.5);
});
