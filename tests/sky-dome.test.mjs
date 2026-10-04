import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,resolve:{alias:{'@':root}},server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {horizonVector,nearestProjectedTarget,zoomCameraPosition}=await vite.ssrLoadModule('/lib/sky-dome.ts');
const close=(actual,expected)=>actual.forEach((value,i)=>assert(Math.abs(value-expected[i])<1e-10));
test('3D horizon frame preserves cardinal directions, altitude and unit radius',()=>{
 close(horizonVector(0,0),[0,0,-1]);close(horizonVector(0,90),[1,0,0]);close(horizonVector(0,180),[0,0,1]);close(horizonVector(0,270),[-1,0,0]);close(horizonVector(90,42),[0,1,0]);
 for(const altitude of [0,30,60,89])for(const azimuth of [0,75,210,359]){const vector=horizonVector(altitude,azimuth);assert(Math.abs(Math.hypot(...vector)-1)<1e-10);assert(Math.abs(Math.asin(vector[1])*180/Math.PI-altitude)<1e-10)}
});
test('3D pointer selection ignores off-screen objects and picks the nearest visible one',()=>{
 const points=[{name:'Hidden',x:100,y:100,visible:false},{name:'Mizar',x:103,y:100,visible:true},{name:'Alkaid',x:113,y:105,visible:true}];
 assert.equal(nearestProjectedTarget(points,100,100),'Mizar');assert.equal(nearestProjectedTarget(points,114,105),'Alkaid');assert.equal(nearestProjectedTarget(points,400,400),undefined);assert.equal(nearestProjectedTarget(points,NaN,100),undefined);
});
test('star photos use catalogue coordinates and planetary photos retain source attribution',async()=>{
 const {objectPhoto}=await vite.ssrLoadModule('/lib/object-photos.ts');
 const vega=objectPhoto('Vega'),url=new URL(vega.src);assert.equal(url.searchParams.get('r'),'18:36:56');assert.equal(url.searchParams.get('d'),'+38:47:01');assert.equal(url.searchParams.get('h'),'15');assert.equal(url.searchParams.get('w'),'15');assert.equal(vega.survey,true);
 assert(new URL(objectPhoto('Sirius').src).searchParams.get('d').startsWith('-16:'));
 for(const name of ['Moon','Venus','Mars','Jupiter','Saturn']){const photo=objectPhoto(name);assert(photo.credit.includes('NASA'));assert(photo.source.startsWith('https://science.nasa.gov/'));assert(!photo.survey)}
 assert.equal(objectPhoto('Unknown'),undefined);assert.equal(objectPhoto('constructor'),undefined);
});

test('camera zoom measures distance from the selected orbit centre and preserves its direction',()=>{
 const target=[0.8,0.6,0],position=[2.24,2.52,0];
 const zoomed=zoomCameraPosition(position,target,.8);
 close(zoomed,[1.952,2.136,0]);
 assert(Math.abs(Math.hypot(...zoomed.map((v,i)=>v-target[i]))-1.92)<1e-10);
 // Translating both camera and target cannot change zoom behaviour.
 const translation=[4,-2,3];
 close(zoomCameraPosition(position.map((v,i)=>v+translation[i]),target.map((v,i)=>v+translation[i]),.8),zoomed.map((v,i)=>v+translation[i]));
 close(zoomCameraPosition(zoomed,target,1.25),position);
});
test('camera zoom clamps orbit distance and stays stable at both limits',()=>{
 const target=[.8,.6,0];
 const near=[2.6,.6,0],far=[5.8,.6,0];
 close(zoomCameraPosition(near,target,.8),near);close(zoomCameraPosition(far,target,1.25),far);
 close(zoomCameraPosition([3.2,.6,0],target,.1),near);close(zoomCameraPosition([3.2,.6,0],target,10),far);
 close(zoomCameraPosition(target,target,.8),target);
});
