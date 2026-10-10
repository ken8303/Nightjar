import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {formatEquatorialCoordinates,catalogueCoordinateCopy}=await vite.ssrLoadModule('/lib/equatorial-coordinates.ts');
const catalogue=JSON.parse(await readFile(new URL('../data/messier.json',import.meta.url),'utf8'));
test('catalogue coordinates format hours and signed degrees including negative values near zero',()=>{
 for(const [id,expected] of [['M31',{ra:'00h 42m 44.4s',dec:'+41° 16′ 08.6″'}],['M42',{ra:'05h 35m 16.5s',dec:'-05° 23′ 22.8″'}],['M77',{ra:'02h 42m 40.7s',dec:'-00° 00′ 47.8″'}]]){
  const target=catalogue.find(value=>value.id===id);assert.deepEqual(formatEquatorialCoordinates(target.ra,target.dec),expected);
 }
});
test('rounding carries seconds and minutes and wraps right ascension at midnight without exceeding poles',()=>{
 assert.equal(formatEquatorialCoordinates(59.96/3600,0).ra,'00h 01m 00.0s');
 assert.equal(formatEquatorialCoordinates(3599.96/3600,0).ra,'01h 00m 00.0s');
 assert.equal(formatEquatorialCoordinates(86399.96/3600,0).ra,'00h 00m 00.0s');
 assert.equal(formatEquatorialCoordinates(0,-1.999999).dec,'-02° 00′ 00.0″');
 for(const dec of [-90,-89.999999,90,89.999999])assert.equal(formatEquatorialCoordinates(0,dec).dec,`${dec<0?'-':'+'}90° 00′ 00.0″`);
 assert.equal(formatEquatorialCoordinates(0,-0).dec,'-00° 00′ 00.0″');
});
test('invalid angles and unavailable catalogue identifiers are rejected rather than coerced',()=>{
 for(const ra of [NaN,Infinity,-.1,24,null,'0',{}])assert.throws(()=>formatEquatorialCoordinates(ra,0),/Invalid/);
 for(const dec of [NaN,Infinity,-90.001,90.001,null,'0',{}])assert.throws(()=>formatEquatorialCoordinates(0,dec),/Invalid/);
 assert.throws(()=>catalogueCoordinateCopy({id:'M102',ra:1,dec:1}),/Invalid catalogue target/);
});
test('all Messier records round-trip within display precision while copies retain exact decimal values and epoch',()=>{
 const original=structuredClone(catalogue);
 for(const target of catalogue){
  const formatted=formatEquatorialCoordinates(target.ra,target.dec);
  const r=formatted.ra.match(/^(\d+)h (\d+)m ([\d.]+)s$/),d=formatted.dec.match(/^([+-])(\d+)° (\d+)′ ([\d.]+)″$/);assert(r&&d,target.id);
  const ra=+r[1]+r[2]/60+r[3]/3600,dec=(d[1]==='-'?-1:1)*(+d[2]+d[3]/60+d[4]/3600);
  const difference=Math.abs(ra-target.ra);assert(Math.min(difference,24-difference)<=.05/3600+1e-12,target.id);assert(Math.abs(dec-target.dec)<=.05/3600+1e-12,target.id);
  assert(+r[2]<60&&+r[3]<60&&+d[3]<60&&+d[4]<60,target.id);
  const copy=catalogueCoordinateCopy(target).split('\n');assert.equal(copy[0],`${target.id} catalogue coordinates (J2000)`);
  assert.equal(Number(copy[3].split(': ')[1]),target.ra);assert.equal(Number(copy[4].split(': ')[1]),target.dec);
 }
 assert.deepEqual(catalogue,original);
});
