import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {OrthographicCamera,Vector3} from 'three';
import {createServer} from './vite-test-server.mjs';
const vite=await createServer({configFile:false,root:fileURLToPath(new URL('../',import.meta.url)),server:{middlewareMode:true},appType:'custom',logLevel:'silent'});after(()=>vite.close());
const {lunarLibration,lunarViewFrame}=await vite.ssrLoadModule('/lib/lunar-view.ts');
const close=(a,b,tolerance=1e-12)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} versus ${b}`);

test('sub-Earth libration and diameter match independent NASA 2026 samples',()=>{
 // NASA SVS 5587 mooninfo_2026.json, geocentric UTC samples, checked
 // 19 October 2026. Longitudes are east positive, diameter is arcseconds.
 const references=[
 ['2026-01-01T00:00Z',-1.279,-6.556,361045,1985.1],
 ['2026-02-01T00:00Z',3.530,-4.278,368528,1944.8],
 ['2026-04-01T00:00Z',4.555,2.344,389875,1838.3],
 ['2026-07-01T00:00Z',-2.620,4.405,403775,1775.1],
 ['2026-10-02T00:00Z',-.052,-6.307,369306,1940.7],
 ['2026-12-31T23:00Z',7.206,5.967,391253,1831.9],
 ];
 for(const [date,longitude,latitude,distance,diameter] of references){const value=lunarLibration(new Date(date));assert(value);close(value.longitude,longitude,.005);close(value.latitude,latitude,.03);close(value.distanceKm,distance,60);close(value.diameterArcminutes*60,diameter,.4)}
});
test('invalid and out-of-planner dates cannot supply a viewpoint',()=>{
 for(const date of [new Date(NaN),new Date('0000-12-31T23:59Z'),new Date('+010000-01-01T00:00Z')])assert.equal(lunarLibration(date),null);
 for(const date of ['0001-01-01T00:00Z','9999-12-31T23:59Z']){const value=lunarLibration(new Date(date));assert(value);assert(Number.isFinite(value.latitude));assert(Number.isFinite(value.longitude));assert(value.diameterArcminutes>0)}
});
test('globe directions share the east-positive landmark frame and stay normalized',()=>{
 const cases=[[0,0,[0,0,1]],[0,90,[1,0,0]],[90,0,[0,1,0]],[-90,0,[0,-1,0]],[0,-90,[-1,0,0]]];
 for(const [lat,lon,expected] of cases){const frame=lunarViewFrame(lat,lon,0);frame.direction.forEach((value,index)=>close(value,expected[index]));close(Math.hypot(...frame.direction),1)}
 for(const [lat,lon,phase] of [[NaN,0,0],[91,0,0],[0,181,0],[0,0,Infinity]])assert.equal(lunarViewFrame(lat,lon,phase),null);
});
test('approximate illumination retains phase angles while the Earth-facing viewpoint librates',()=>{
 for(const [lat,lon] of [[0,0],[-6.5,-1.3],[6,7.2]])for(const phase of [0,45,90,180,270,360]){
  const frame=lunarViewFrame(lat,lon,phase);close(Math.hypot(...frame.light),1);
  const dot=frame.direction.reduce((sum,value,index)=>sum+value*frame.light[index],0);
  close(dot,-Math.cos(phase*Math.PI/180));
 }
});
test('orthographic Earth view centres the sub-Earth point with lunar north up and east to the right',()=>{
 const latitude=-6.532,longitude=-1.279,frame=lunarViewFrame(latitude,longitude,90);
 const camera=new OrthographicCamera(-1.3,1.3,1.3,-1.3,.1,100);camera.position.fromArray(frame.direction).multiplyScalar(3.6);camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const centre=new Vector3(...frame.direction).project(camera);close(centre.x,0);close(centre.y,0);
 const north=new Vector3(...lunarViewFrame(latitude+1,longitude,0).direction).project(camera);
 const east=new Vector3(...lunarViewFrame(latitude,longitude+1,0).direction).project(camera);
 assert(north.y>centre.y);assert(east.x>centre.x);
 // Orthographic limb is at 90°, independent of illustrative zoom distance.
 const limb=new Vector3(1,0,0).applyAxisAngle(new Vector3(0,1,0),longitude*Math.PI/180);
 close(limb.dot(new Vector3(...frame.direction)),0);
});
