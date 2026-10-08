import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createServer} from './vite-test-server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const vite=await createServer({configFile:false,root,server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
after(()=>vite.close());
const {watchCameraOrientation}=await vite.ssrLoadModule('/lib/camera-orientation.ts');
function harness(){
 const events=new EventTarget(),screen=new EventTarget(),result={reading:null,quiet:false,unavailable:[],absolute:0,relative:0,reads:0,cancelled:false};
 let time=0,angle=0,tick,deferred=null;
 const dispose=watchCameraOrientation(events,screen,{onReading:reading=>{result.reading=reading;result.reads++},onQuiet:quiet=>result.quiet=quiet,onUnavailable:reason=>{result.reading=null;result.unavailable.push(reason)},onAbsolute:()=>result.absolute++,onRelative:()=>result.relative++},{angle:()=>angle,now:()=>time,schedule:callback=>{tick=callback;return()=>{result.cancelled=true}},defer:(callback,delay)=>{const work={callback,due:time+delay};deferred=work;return()=>{if(deferred===work)deferred=null}}});
 function read(values={},type='deviceorientation'){
  const event=Object.assign(new Event(type),{alpha:0,beta:90,gamma:0,absolute:false},values);events.dispatchEvent(event);
 }
 return {events,screen,result,dispose,read,advance:delta=>{time+=delta;if(deferred&&time>=deferred.due){const work=deferred;deferred=null;work.callback()}tick()},setTime:value=>time=value,rotate:value=>{angle=value;screen.dispatchEvent(new Event('change'))}};
}
test('a quiet stationary phone retains its pose and marks the last reading instead of losing labels',()=>{
 const h=harness();h.read({absolute:true});const pose=h.result.reading;
 h.advance(3999);assert.equal(h.result.quiet,false);h.advance(1);assert.equal(h.result.quiet,true);
 h.advance(60000);assert.equal(h.result.reading,pose);assert.deepEqual(h.result.unavailable,[]);
 h.read({alpha:270,absolute:true});assert.equal(h.result.quiet,false);assert.notEqual(h.result.reading,pose);h.dispose();
});
test('a device that never provides a reading shows waiting once without inventing a pose',()=>{
 const h=harness();h.advance(4000);h.advance(4000);
 assert.equal(h.result.reading,null);assert.equal(h.result.quiet,false);assert.deepEqual(h.result.unavailable,['waiting']);h.dispose();
});
test('invalid readings clear the pose and rapid valid recovery bypasses throttling',()=>{
 const h=harness();h.read();h.setTime(10);h.read({alpha:null});
 assert.equal(h.result.reading,null);assert.equal(h.result.unavailable.at(-1),'invalid');
 h.setTime(20);h.read({alpha:45});assert.equal(h.result.reads,2);assert(h.result.reading);h.dispose();
});
test('screen rotation pauses the old projection until a fresh reading uses the new axes',()=>{
 const h=harness();h.read({alpha:90,beta:0,gamma:-90});h.rotate(90);
 assert.equal(h.result.reading,null);assert.equal(h.result.unavailable.at(-1),'rotated');
 h.setTime(10);h.read({alpha:90,beta:0,gamma:-90});
 const {right,up}=h.result.reading.basis;assert(Math.abs(right[0]-1)<1e-10);assert(Math.abs(up[2]-1)<1e-10);h.dispose();
});
test('absolute compass readings supersede relative data even within the render throttle',()=>{
 const h=harness();h.read();h.setTime(10);h.read({alpha:270},'deviceorientationabsolute');
 assert.equal(h.result.absolute,1);assert.equal(h.result.reading.absolute,true);assert.equal(h.result.reads,2);
 const pose=h.result.reading;h.setTime(200);h.read({alpha:45});assert.equal(h.result.reading,pose);
 h.read({alpha:270,absolute:true});assert.equal(h.result.absolute,1);h.dispose();
});
test('high-frequency readings are throttled and disposal removes listeners and the timer',()=>{
 const h=harness();h.read();h.setTime(40);h.read({alpha:10});assert.equal(h.result.reads,1);
 h.setTime(80);h.read({alpha:20});assert.equal(h.result.reads,2);h.dispose();
 const pose=h.result.reading;h.read({alpha:30});h.rotate(90);h.events.dispatchEvent(new Event('orientationchange'));h.advance(10000);
 assert.equal(h.result.reading,pose);assert.equal(h.result.reads,2);assert.equal(h.result.quiet,false);assert.equal(h.result.cancelled,true);
});

test('Safari compass heading anchors relative orientation and moving the phone updates sky direction',()=>{
 const h=harness();h.read({alpha:42,beta:120,gamma:0,webkitCompassHeading:180,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,true);assert.equal(h.result.absolute,1);
 const first=h.result.reading.basis.forward;assert(Math.abs(first[0])<1e-10);assert(first[1]>.8);assert(first[2]>.4);
 h.setTime(100);h.read({alpha:42,beta:120,gamma:0,webkitCompassHeading:270,webkitCompassAccuracy:5});
 const moved=h.result.reading.basis.forward;assert(moved[0]>.8);assert(Math.abs(moved[1])<1e-10);assert.equal(h.result.absolute,1);h.dispose();
});
test('Safari unusable compass readings fall back to relative alignment and recover without keeping an old correction',()=>{
 const h=harness();h.read({alpha:0,beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,true);
 h.setTime(501);h.read({alpha:20,beta:120,webkitCompassHeading:0,webkitCompassAccuracy:-1});assert.equal(h.result.reading.absolute,false);
 h.setTime(520);h.read({alpha:20,beta:120,webkitCompassHeading:200,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,true);assert.equal(h.result.absolute,2);
 h.setTime(600);h.read({beta:90,webkitCompassHeading:200,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,true);h.dispose();
});


test('upright Safari poses retain north alignment while fresh gyro readings keep turning the camera',()=>{
 const h=harness();h.read({alpha:40,beta:120,webkitCompassHeading:140,webkitCompassAccuracy:5});
 h.setTime(100);h.read({alpha:40,beta:90,webkitCompassHeading:140,webkitCompassAccuracy:5});
 const first=h.result.reading.basis.forward;assert.equal(h.result.reading.absolute,true);
 h.setTime(200);h.read({alpha:130,beta:90,webkitCompassHeading:140,webkitCompassAccuracy:5});
 const second=h.result.reading.basis.forward;assert.equal(h.result.reading.absolute,true);
 assert(Math.abs(first[0]*second[0]+first[1]*second[1])<1e-10);assert.equal(h.result.absolute,1);
 h.setTime(5000);h.read({alpha:140,beta:90,webkitCompassHeading:140,webkitCompassAccuracy:5});
 h.setTime(5100);h.read({alpha:150,beta:90,webkitCompassHeading:-1,webkitCompassAccuracy:-1});assert.equal(h.result.reading.absolute,true);h.dispose();
});
test('brief Safari compass dropouts do not blink labels, but sustained loss requires alignment',()=>{
 const h=harness();h.read({alpha:0,beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5});
 h.setTime(100);h.read({alpha:10,beta:120,webkitCompassHeading:-1,webkitCompassAccuracy:-1});assert.equal(h.result.reading.absolute,true);
 h.setTime(200);h.read({alpha:20,beta:120,webkitCompassHeading:200,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,true);assert.equal(h.result.absolute,1);
 h.setTime(701);h.read({alpha:30,beta:120,webkitCompassHeading:-1,webkitCompassAccuracy:-1});assert.equal(h.result.reading.absolute,false);
 h.setTime(800);h.read({alpha:30,beta:120,webkitCompassHeading:210,webkitCompassAccuracy:5});assert.equal(h.result.absolute,2);h.dispose();
});
test('an upright initial pose has no invented north anchor and invalid orientation clears an old anchor',()=>{
 const h=harness();h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,false);
 h.setTime(100);h.read({beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,true);
 h.setTime(200);h.read({alpha:null,webkitCompassHeading:180,webkitCompassAccuracy:5});assert.equal(h.result.reading,null);
 h.setTime(300);h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});assert.equal(h.result.reading.absolute,false);h.dispose();
});


test('invalid secondary relative events cannot erase a preferred absolute pose or keep it falsely fresh',()=>{
 const h=harness();h.read({alpha:270},'deviceorientationabsolute');const pose=h.result.reading;
 h.setTime(100);h.read({alpha:null});
 assert.equal(h.result.reading,pose);assert.deepEqual(h.result.unavailable,[]);
 h.setTime(3900);h.read({alpha:45});h.advance(100);
 assert.equal(h.result.quiet,true);assert.equal(h.result.reading,pose);
 h.read({alpha:260},'deviceorientationabsolute');assert.equal(h.result.quiet,false);assert.equal(h.result.reads,2);
 h.read({alpha:null},'deviceorientationabsolute');assert.equal(h.result.reading,null);assert.equal(h.result.unavailable.at(-1),'invalid');h.dispose();
});
test('secondary relative data cannot restore a pose after screen rotation while absolute data is preferred',()=>{
 const h=harness();h.read({alpha:270},'deviceorientationabsolute');h.rotate(90);
 h.setTime(100);h.read({alpha:45});assert.equal(h.result.reading,null);
 h.read({alpha:270},'deviceorientationabsolute');assert(h.result.reading);assert.equal(h.result.reading.absolute,true);h.dispose();
});


test('Safari motion still turns the view when a brief event omits its compass fields',()=>{
 const h=harness();h.read({alpha:40,beta:120,webkitCompassHeading:140,webkitCompassAccuracy:5});
 const first=h.result.reading.basis.forward;
 h.setTime(100);h.read({alpha:130,beta:120});
 assert.equal(h.result.reading.absolute,true);assert.equal(h.result.reads,2);
 const moved=h.result.reading.basis.forward;
 assert(Math.abs(first[0]*moved[0]+first[1]*moved[1])<1e-10);
 h.setTime(501);h.read({alpha:140,beta:120});assert.equal(h.result.reading.absolute,false);
 h.setTime(520);h.read({alpha:140,beta:120,webkitCompassHeading:240,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,true);assert.equal(h.result.absolute,2);h.dispose();
});
test('missing Safari heading fields do not fabricate an anchor and invalid gyro data still clears it',()=>{
 const h=harness();h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});
 h.setTime(100);h.read({alpha:20,beta:90});assert.equal(h.result.reading.absolute,false);
 h.setTime(200);h.read({beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5});
 h.setTime(300);h.read({alpha:null});assert.equal(h.result.reading,null);
 h.setTime(400);h.read({beta:90});assert.equal(h.result.reading.absolute,false);h.dispose();
});


test('compass correction does not flip north while oscillating around the upright cutoff',()=>{
 const h=harness();h.read({alpha:0,beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5});
 h.setTime(100);h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});
 for(const [time,beta,heading] of [[200,97,0],[300,94,270],[400,98,90],[500,96,0]]){
  h.setTime(time);h.read({beta,webkitCompassHeading:heading,webkitCompassAccuracy:5});
  const direction=h.result.reading.basis.forward;
  assert.equal(h.result.reading.absolute,true);assert(Math.abs(direction[0])<1e-10);assert(direction[1]>.98);
 }
 // Once tilted far enough, a usable compass correction is applied again.
 h.setTime(600);h.read({beta:105,webkitCompassHeading:270,webkitCompassAccuracy:5});
 assert(h.result.reading.basis.forward[0]>.96);assert(Math.abs(h.result.reading.basis.forward[1])<1e-10);h.dispose();
});
test('upright hysteresis preserves fresh turning and works independently of screen rotation',()=>{
 const h=harness();h.read({alpha:0,beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5});
 h.setTime(100);h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});h.rotate(90);
 h.setTime(200);h.read({alpha:90,beta:97,webkitCompassHeading:0,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,true);assert(h.result.reading.basis.forward[0]<-.99);
 h.setTime(300);h.read({alpha:null});assert.equal(h.result.reading,null);
 // Invalid gyro data removes both the cached anchor and its hysteresis state.
 h.setTime(400);h.read({alpha:0,beta:97,webkitCompassHeading:180,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,true);assert(h.result.reading.basis.forward[1]>.99);h.dispose();
});


test('the final throttled pose is delivered even when the phone stops generating events',()=>{
 const h=harness();h.read({alpha:0});h.setTime(20);h.read({alpha:30});h.setTime(40);h.read({alpha:90});
 assert.equal(h.result.reads,1);h.advance(39);assert.equal(h.result.reads,1);
 h.advance(1);assert.equal(h.result.reads,2);assert(h.result.reading.basis.forward[0]<-.99);
 h.advance(100);assert.equal(h.result.reads,2);h.dispose();
});
test('queued poses cannot restore labels after invalid data, rotation or disposal',()=>{
 for(const invalidate of ['invalid','rotation','dispose']){
  const h=harness();h.read();h.setTime(20);h.read({alpha:90});
  if(invalidate==='invalid')h.read({alpha:null});
  if(invalidate==='rotation')h.rotate(90);
  if(invalidate==='dispose')h.dispose();
  const pose=h.result.reading;h.advance(80);
  assert.equal(h.result.reads,1);assert.equal(h.result.reading,pose);h.dispose();
 }
});
test('an immediate absolute source transition cancels queued relative data',()=>{
 const h=harness();h.read();h.setTime(20);h.read({alpha:90});
 h.setTime(30);h.read({alpha:270},'deviceorientationabsolute');
 const pose=h.result.reading;assert.equal(pose.absolute,true);assert.equal(h.result.reads,2);
 h.advance(100);assert.equal(h.result.reading,pose);assert.equal(h.result.reads,2);h.dispose();
});


test('compass loss invalidates north-based calibration before delivering the relative fallback pose',()=>{
 const events=new EventTarget();let time=0,calibration={aligned:false,offset:0},reading=null;const order=[];
 const dispose=watchCameraOrientation(events,null,{
  onReading:value=>{reading=value;order.push('reading');if(!value.absolute)assert.deepEqual(calibration,{aligned:false,offset:0})},
  onQuiet:()=>{},onUnavailable:()=>{},
  onAbsolute:()=>{calibration={aligned:false,offset:0}},
  onRelative:()=>{order.push('reset');calibration={aligned:false,offset:0}},
 },{angle:()=>0,now:()=>time,schedule:()=>()=>{}});
 const send=values=>events.dispatchEvent(Object.assign(new Event('deviceorientation'),{alpha:0,beta:120,gamma:0,absolute:false},values));
 send({webkitCompassHeading:180,webkitCompassAccuracy:5});calibration={aligned:true,offset:25};
 time=100;send({webkitCompassHeading:-1,webkitCompassAccuracy:-1});
 assert.equal(reading.absolute,true);assert.equal(calibration.offset,25);
 order.length=0;time=501;send({webkitCompassHeading:-1,webkitCompassAccuracy:-1});
 assert.equal(reading.absolute,false);assert.deepEqual(order,['reset','reading']);dispose();
});
test('relative-source reset fires once per compass loss and does not erase ordinary relative alignment',()=>{
 const h=harness();h.read();h.setTime(100);h.read({alpha:30});assert.equal(h.result.relative,0);
 h.setTime(200);h.read({alpha:30,beta:120,webkitCompassHeading:210,webkitCompassAccuracy:5});
 h.setTime(701);h.read({alpha:40,beta:120});assert.equal(h.result.relative,1);
 h.setTime(800);h.read({alpha:50,beta:120});assert.equal(h.result.relative,1);
 h.setTime(900);h.read({alpha:50,beta:120,webkitCompassHeading:230,webkitCompassAccuracy:5});
 h.setTime(1401);h.read({alpha:60,beta:120});assert.equal(h.result.relative,2);h.dispose();
});

test('an initially upright Safari phone requests north setup until a tilted compass anchor is established',()=>{
 const h=harness();h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,false);assert.equal(h.result.reading.needsNorthAnchor,true);
 h.setTime(100);h.read({beta:60,webkitCompassHeading:0,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,true);assert.equal(h.result.reading.needsNorthAnchor,undefined);
 h.setTime(200);h.read({beta:90,webkitCompassHeading:0,webkitCompassAccuracy:5});
 assert.equal(h.result.reading.absolute,true);assert.equal(h.result.reading.needsNorthAnchor,undefined);h.dispose();
});
test('north setup guidance is not invented for relative-only or unusable-compass streams',()=>{
 for(const values of [{beta:90},{beta:90,webkitCompassHeading:0,webkitCompassAccuracy:-1},{beta:90,absolute:true}]){
  const h=harness();h.read(values);assert.equal(h.result.reading.needsNorthAnchor,undefined);h.dispose();
 }
});
test('Safari compass metadata follows fresh/coalesced readings and does not reuse old accuracy through dropouts or relative fallback',()=>{
 const h=harness();h.read({beta:120,webkitCompassHeading:180,webkitCompassAccuracy:5.1});assert.equal(h.result.reading.northReference,'magnetic');assert.equal(h.result.reading.compassAccuracy,5.1);
 h.setTime(20);h.read({beta:120,webkitCompassHeading:190,webkitCompassAccuracy:40});h.advance(60);assert.equal(h.result.reading.compassAccuracy,40);assert.equal(h.result.absolute,1);
 h.setTime(100);h.read({beta:120,alpha:20});h.advance(60);assert.equal(h.result.reading.absolute,true);assert.equal(h.result.reading.northReference,'magnetic');assert.equal(h.result.reading.compassAccuracy,undefined);
 h.setTime(701);h.read({beta:120,alpha:30});assert.equal(h.result.reading.absolute,false);assert.equal(h.result.reading.northReference,undefined);assert.equal(h.result.reading.compassAccuracy,undefined);h.dispose();
 const standard=harness();standard.read({absolute:true});assert.equal(standard.result.reading.northReference,undefined);assert.equal(standard.result.reading.compassAccuracy,undefined);standard.dispose();
});
