import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {numberEntryValue:parse}=await vite.ssrLoadModule('/lib/number-entry.ts');
const {validImagingEquipment,fieldOfView,imageScale,mosaic}=await vite.ssrLoadModule('/lib/photography.ts');
test('decimal entry accepts equivalent dot/comma, signed, exponent and normalized text',()=>{
 for(const [raw,value] of [['12,5',12.5],['12.5',12.5],[',5',.5],['.5',.5],['1,',1],['1.',1],['+2,5e2',250],[' −１２，５ ',-12.5],['３.７６',3.76],['-0',-0]])assert.equal(parse(raw),value,raw);
});
test('empty and incomplete entries never become zero or a partial valid number',()=>{
 for(const raw of ['', ' ', '-', '+', '.', ',', '1e', '1e+', '1e-', 'e2', '-,', '+.'])assert.equal(parse(raw),null,raw);
});
test('mixed separators, grouping, hex, arbitrary text and nonfinite entries are rejected',()=>{
 for(const raw of ['1,2,3','1.2.3','1,234.5','1.234,5','1 234','1_234','0x10','0b10','Infinity','NaN','1e309','12mm','--1','+-1','-−1','1 e2'])assert.equal(parse(raw),null,raw);
});
test('localized equipment and mosaic values preserve units and enforce calculation bounds',()=>{
 const equipment={name:'Localized setup',width:parse('23,5'),height:parse('15,6'),focal:parse('4e2'),pixel:parse('3,76')};assert(validImagingEquipment(equipment));
 const w=fieldOfView(equipment.width,equipment.focal),h=fieldOfView(equipment.height,equipment.focal);
 assert.equal(w,fieldOfView(23.5,400));assert.equal(imageScale(equipment.pixel,equipment.focal),imageScale(3.76,400));
 const localized=mosaic(parse('1,25'),parse('−23,5'),w,h,parse('2'),parse('2'),parse('20,0'),parse('−15,5'));
 assert.deepEqual(localized,mosaic(1.25,-23.5,w,h,2,2,20,-15.5));assert.equal(localized.length,4);
 assert.throws(()=>mosaic(parse('24,0'),0,w,h,2,2,20,0));assert.throws(()=>mosaic(1,0,w,h,parse('2,5'),2,20,0));
 assert.equal(validImagingEquipment({...equipment,width:parse('0,01')}),false);
});
