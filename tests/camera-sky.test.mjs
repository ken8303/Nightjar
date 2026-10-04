import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {deviceCameraBasis,manualCameraBasis,projectSkyTarget,cameraDirection,rotateCameraBearing,bearingDifference,cameraErrorMessage,stopCameraStream,targetDirectionGuide,cameraHeadingAlignment}=await vite.ssrLoadModule('/lib/camera-sky.ts');
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('rear-camera sensor rotations match north, east, pitch and landscape screen axes',()=>{
 const north=deviceCameraBasis(0,90,0);near(cameraDirection(north).bearing,0);near(cameraDirection(north).altitude,0);
 const east=deviceCameraBasis(270,90,0);near(cameraDirection(east).bearing,90);
 const raised=deviceCameraBasis(270,120,0);near(cameraDirection(raised).bearing,90);near(cameraDirection(raised).altitude,30);
 const landscape=deviceCameraBasis(90,0,-90,90);near(cameraDirection(landscape).bearing,0);near(landscape.right[0],1);near(landscape.up[2],1);
 for(const basis of [north,east,raised,landscape,deviceCameraBasis(123,-37,42,270)]){
  for(const axis of Object.values(basis))near(Math.hypot(...axis),1);
  near(basis.right.reduce((sum,v,i)=>sum+v*basis.forward[i],0),0);
  near(basis.up.reduce((sum,v,i)=>sum+v*basis.forward[i],0),0);
 }
 assert.equal(deviceCameraBasis(null,90,0),null);assert.equal(deviceCameraBasis(0,NaN,0),null);
});
test('sky projection centres the aimed target and rejects the horizon, rear and out-of-view targets',()=>{
 for(const bearing of [0,90,180,270,359]){
  const basis=manualCameraBasis(bearing,30),centre=projectSkyTarget(30,bearing,basis,.75,60);
  near(centre.x,.5);near(centre.y,.5);
  assert(projectSkyTarget(30,bearing+10,basis,.75,60).x>.5);
  assert(projectSkyTarget(40,bearing,basis,.75,60).y<.5);
  assert.equal(projectSkyTarget(30,bearing+180,basis,.75,60),null);
  assert.equal(projectSkyTarget(30,bearing+80,basis,.75,60),null);
  assert.equal(projectSkyTarget(0,bearing,basis,.75,60),null);
 }
 assert.equal(projectSkyTarget(30,0,manualCameraBasis(0,30),0,60),null);
 assert.equal(projectSkyTarget(30,0,manualCameraBasis(0,30),.75,NaN),null);
});
test('field of view and aspect ratio change scale without changing the optical centre',()=>{
 const basis=manualCameraBasis(0,30);
 const narrow=projectSkyTarget(30,10,basis,.75,40),wide=projectSkyTarget(30,10,basis,.75,80),landscape=projectSkyTarget(30,10,basis,1.5,40);
 assert(narrow.x>wide.x);near(landscape.x-.5,(narrow.x-.5)/2);
});
test('heading alignment crosses north without a long rotation and preserves elevation and roll',()=>{
 assert.equal(bearingDifference(1,359),2);assert.equal(bearingDifference(359,1),-2);
 const basis=deviceCameraBasis(42,123,21,90),direction=cameraDirection(basis);
 const rotated=rotateCameraBearing(basis,bearingDifference(1,direction.bearing));
 near(cameraDirection(rotated).bearing,1);near(cameraDirection(rotated).altitude,direction.altitude);
 const target=projectSkyTarget(direction.altitude,direction.bearing,basis,.75,60);
 const corrected=projectSkyTarget(direction.altitude,1,rotated,.75,60);
 near(target.x,corrected.x);near(target.y,corrected.y);
});
test('camera failures offer relevant recovery and stream shutdown stops all tracks',()=>{
 assert.match(cameraErrorMessage({name:'NotAllowedError'}),/denied/);
 assert.match(cameraErrorMessage({name:'NotFoundError'}),/rear camera/);
 assert.match(cameraErrorMessage({name:'NotReadableError'}),/busy/);
 assert.match(cameraErrorMessage(null),/could not start/);
 let stopped=0;stopCameraStream({getTracks:()=>[{stop:()=>stopped++},{stop:()=>stopped++}]});assert.equal(stopped,2);stopCameraStream(null);
});

test('target guidance wraps north and distinguishes bearing, elevation and actual angular distance',()=>{
 const acrossNorth=targetDirectionGuide(manualCameraBasis(359,30),30,1);
 assert.equal(acrossNorth.below,false);near(acrossNorth.bearingDelta,2);near(acrossNorth.elevationDelta,0);assert(acrossNorth.separation<2);
 const raised=targetDirectionGuide(manualCameraBasis(90,30),60,90);near(raised.separation,30);near(raised.elevationDelta,30);near(raised.bearingDelta,0);
 const behind=targetDirectionGuide(manualCameraBasis(0,30),30,180);near(behind.separation,120);
 // Opposite bearings near zenith can still be close together on the sky.
 near(targetDirectionGuide(manualCameraBasis(0,89),89,180).separation,2);
 assert.equal(targetDirectionGuide(manualCameraBasis(0,30),0,0).below,true);
 assert.equal(targetDirectionGuide(manualCameraBasis(0,30),-10,0).below,true);
 assert.equal(targetDirectionGuide(manualCameraBasis(0,30),NaN,0),null);
});


test('heading calibration refuses unstable overhead directions and below-horizon targets',()=>{
 for(const altitude of [85,89,90]){
  assert.equal(cameraHeadingAlignment(manualCameraBasis(0,altitude),30,90).reason,'zenith');
  assert.equal(cameraHeadingAlignment(manualCameraBasis(0,30),altitude,90).reason,'zenith');
 }
 assert.equal(cameraHeadingAlignment(manualCameraBasis(0,-89),30,90).reason,'zenith');
 for(const altitude of [0,-1])assert.equal(cameraHeadingAlignment(manualCameraBasis(0,30),altitude,90).reason,'horizon');
 assert.equal(cameraHeadingAlignment(manualCameraBasis(0,30),NaN,90).reason,'invalid');
 assert.equal(cameraHeadingAlignment(manualCameraBasis(0,30),30,Infinity).reason,'invalid');
});
test('heading calibration requires pitch agreement before applying the shortest bearing correction',()=>{
 assert.equal(cameraHeadingAlignment(manualCameraBasis(359,30),41,1).reason,'pitch');
 assert.equal(cameraHeadingAlignment(manualCameraBasis(359,30),19,1).reason,'pitch');
 const ready=cameraHeadingAlignment(manualCameraBasis(359,30),39.9,1);
 assert.equal(ready.reason,'ready');near(ready.offset,2);
 const high=cameraHeadingAlignment(manualCameraBasis(90,84),84,270);
 assert.equal(high.reason,'ready');near(Math.abs(high.offset),180);
});
