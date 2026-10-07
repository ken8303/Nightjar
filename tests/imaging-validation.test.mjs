import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {validEquipment,validImagingEquipment,guidingPixels,fieldOfView,imageScale,formatRaHours,mosaicCsv}=await vite.ssrLoadModule('/lib/photography.ts');
const setup={name:'Test setup',width:36,height:24,focal:400,pixel:3.76};
test('imaging editor bounds agree with controls while legacy small-valued profiles remain schema-readable',()=>{
 assert(validImagingEquipment(setup));
 for(const field of ['width','height','focal','pixel']){const small={...setup,[field]:.01};assert(validEquipment(small));assert(!validImagingEquipment(small));assert(validImagingEquipment({...setup,[field]:.1}));assert(!validImagingEquipment({...setup,[field]:NaN}));assert(!validImagingEquipment({...setup,[field]:Infinity}))}
 assert(validImagingEquipment({name:'Limits',width:100,height:.1,focal:20000,pixel:100}));assert(!validImagingEquipment({...setup,name:''}));
});
test('supported equipment bounds always produce finite frame and sampling values',()=>{
 for(const dimension of [.1,100])for(const focal of [.1,20000])for(const pixel of [.1,100]){assert(Number.isFinite(fieldOfView(dimension,focal)));assert(Number.isFinite(imageScale(pixel,focal)));assert(Number.isFinite(guidingPixels(100,imageScale(pixel,focal))))}
});
test('guiding conversion rejects out-of-range and overflowing inputs instead of rendering Infinity',()=>{
 assert.equal(guidingPixels(0,1),0);assert.equal(guidingPixels(2,1),2);assert.equal(guidingPixels(100,2),50);
 for(const [rms,scale] of [[-1,1],[100.01,1],[Infinity,1],[NaN,1],[1,0],[1,-1],[1,Infinity],[1,NaN],[100,1e-310]])assert.equal(guidingPixels(rms,scale),null);
});


test('rounded RA display and CSV keep a valid near-24-hour coordinate in the canonical range',()=>{
 const ra=23.999999999;assert.equal(formatRaHours(ra),'0.00000');assert.equal(formatRaHours(ra,7),'0.0000000');assert.equal(formatRaHours(23.999994),'23.99999');assert.equal(formatRaHours(0),'0.00000');
 const panel={panel:1,row:1,column:1,raHours:ra,decDegrees:1},before=structuredClone(panel);assert(mosaicCsv([panel]).includes(',0.0000000,1.0000000'));assert.deepEqual(panel,before);
 for(const value of [-1,24,NaN,Infinity])assert.throws(()=>formatRaHours(value),/Invalid/);for(const precision of [-1,11,.5])assert.throws(()=>formatRaHours(1,precision),/Invalid/);
});
